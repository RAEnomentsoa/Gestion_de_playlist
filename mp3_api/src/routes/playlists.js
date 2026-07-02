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
  const {
    genre,
    exclude_genre,
    artiste,
    exclude_artist,
    album,
    langue,
    year_min,
    year_max,
    target_duration_seconds,
  } = req.body || {};

  const toArr = (v) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);

  const target         = Number(target_duration_seconds) || 0;
  const genres         = toArr(genre);
  const excludeGenres  = toArr(exclude_genre);
  const artistes       = toArr(artiste);
  const excludeArtists = toArr(exclude_artist);
  const albums         = toArr(album);
  const langues        = toArr(langue);

  const conditions = [];
  const params = [];

  if (genres.length > 0) {
    conditions.push(`genre IN (${genres.map(() => "?").join(", ")})`);
    params.push(...genres);
  }
  if (excludeGenres.length > 0) {
    conditions.push(`(genre IS NULL OR genre NOT IN (${excludeGenres.map(() => "?").join(", ")}))`);
    params.push(...excludeGenres);
  }
  if (artistes.length > 0) {
    conditions.push(`artiste IN (${artistes.map(() => "?").join(", ")})`);
    params.push(...artistes);
  }
  if (excludeArtists.length > 0) {
    conditions.push(`(artiste IS NULL OR artiste NOT IN (${excludeArtists.map(() => "?").join(", ")}))`);
    params.push(...excludeArtists);
  }
  if (albums.length > 0) {
    conditions.push(`album IN (${albums.map(() => "?").join(", ")})`);
    params.push(...albums);
  }
  if (langues.length > 0) {
    conditions.push(`langue IN (${langues.map(() => "?").join(", ")})`);
    params.push(...langues);
  }
  if (year_min) {
    conditions.push(`CAST(SUBSTR(date_sortie, 1, 4) AS INTEGER) >= ?`);
    params.push(Number(year_min));
  }
  if (year_max) {
    conditions.push(`CAST(SUBSTR(date_sortie, 1, 4) AS INTEGER) <= ?`);
    params.push(Number(year_max));
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const songs = db.prepare(`SELECT * FROM songs ${where}`).all(...params);

  const candidates = shuffle(songs);
  const picked = [];
  let total = 0;

  for (const song of candidates) {
    if (target > 0 && total >= target) break;
    const dur = parseDurationToSeconds(song.duree);
    if (target > 0 && total + dur > target + 59) continue;
    picked.push(toTrack(song));
    total += dur;
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
