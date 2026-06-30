const express = require("express");
const fs = require("fs");
const archiver = require("archiver");
const db = require("../database");
const { parseDurationToSeconds } = require("../utils/duration");

const router = express.Router();

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toTrack(song) {
  return {
    id: song.id,
    titre: song.titre,
    artiste: song.artiste,
    album: song.album,
    genre: song.genre,
    duree: song.duree,
    duration_seconds: parseDurationToSeconds(song.duree),
    stream_url: `/api/songs/${song.id}/stream`,
  };
}

function loadPlaylist(id) {
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(id);
  if (!playlist) return null;

  const songs = db
    .prepare(
      `SELECT songs.* FROM playlist_tracks
       JOIN songs ON songs.id = playlist_tracks.song_id
       WHERE playlist_tracks.playlist_id = ?
       ORDER BY playlist_tracks.position ASC`
    )
    .all(id);

  const tracks = songs.map(toTrack);
  const total_duration_seconds = tracks.reduce((sum, t) => sum + t.duration_seconds, 0);

  return { ...playlist, tracks, total_duration_seconds };
}

router.post("/generate", (req, res) => {
  const { genre, target_duration_seconds } = req.body || {};
  const target = Number(target_duration_seconds) || 0;
  const genres = (Array.isArray(genre) ? genre : genre ? [genre] : []).filter(Boolean);

  const songs = genres.length > 0
    ? db.prepare(`SELECT * FROM songs WHERE genre IN (${genres.map(() => "?").join(", ")})`).all(...genres)
    : db.prepare("SELECT * FROM songs").all();

  const candidates = shuffle(songs);
  const picked = [];
  let total = 0;

  for (const song of candidates) {
    if (target > 0 && total >= target) break;
    picked.push(toTrack(song));
    total += parseDurationToSeconds(song.duree);
  }

  res.json({ tracks: picked, total_duration_seconds: total });
});

router.post("/", (req, res) => {
  const { name, owner_name, genre, target_duration, song_ids } = req.body || {};

  if (!name || !owner_name || !Array.isArray(song_ids) || song_ids.length === 0) {
    return res.status(400).json({ error: "name, owner_name and a non-empty song_ids array are required" });
  }

  const genreLabel = Array.isArray(genre) ? genre.filter(Boolean).join(", ") || null : genre || null;

  const createPlaylist = db.transaction(() => {
    const info = db
      .prepare("INSERT INTO playlists (name, owner_name, genre, target_duration) VALUES (?, ?, ?, ?)")
      .run(name, owner_name, genreLabel, target_duration || null);

    const insertTrack = db.prepare(
      "INSERT INTO playlist_tracks (playlist_id, song_id, position) VALUES (?, ?, ?)"
    );
    song_ids.forEach((songId, index) => insertTrack.run(info.lastInsertRowid, songId, index));

    return info.lastInsertRowid;
  });

  const id = createPlaylist();
  res.status(201).json(loadPlaylist(id));
});

router.get("/", (req, res) => {
  const { owner_name } = req.query;
  const ids = owner_name
    ? db.prepare("SELECT id FROM playlists WHERE owner_name = ? ORDER BY created_at DESC").all(owner_name)
    : db.prepare("SELECT id FROM playlists ORDER BY created_at DESC").all();

  res.json(ids.map((row) => loadPlaylist(row.id)));
});

router.get("/:id", (req, res) => {
  const playlist = loadPlaylist(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: "not found" });
  }
  res.json(playlist);
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM playlists WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "not found" });
  }

  const { name, song_ids } = req.body || {};

  const updatePlaylist = db.transaction(() => {
    if (name !== undefined) {
      db.prepare("UPDATE playlists SET name = ? WHERE id = ?").run(name, req.params.id);
    }
    if (Array.isArray(song_ids)) {
      db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ?").run(req.params.id);
      const insertTrack = db.prepare(
        "INSERT INTO playlist_tracks (playlist_id, song_id, position) VALUES (?, ?, ?)"
      );
      song_ids.forEach((songId, index) => insertTrack.run(req.params.id, songId, index));
    }
  });

  updatePlaylist();
  res.json(loadPlaylist(req.params.id));
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM playlists WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "not found" });
  }
  res.json({ deleted: true });
});

router.get("/:id/download", (req, res) => {
  const playlist = loadPlaylist(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: "not found" });
  }

  const songs = db
    .prepare(
      `SELECT songs.* FROM playlist_tracks
       JOIN songs ON songs.id = playlist_tracks.song_id
       WHERE playlist_tracks.playlist_id = ?
       ORDER BY playlist_tracks.position ASC`
    )
    .all(req.params.id);

  res.attachment(`${playlist.name}.zip`);
  const archive = archiver("zip");
  archive.on("error", (err) => res.status(500).end(String(err)));
  archive.pipe(res);

  for (const song of songs) {
    if (fs.existsSync(song.absolute_path)) {
      archive.file(song.absolute_path, { name: song.file_name });
    } else {
      console.warn(`[API] skipping missing file for zip: ${song.absolute_path}`);
    }
  }

  archive.finalize();
});

module.exports = router;
