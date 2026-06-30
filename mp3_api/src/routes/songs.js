const express = require("express");
const fs = require("fs");
const db = require("../database");

const router = express.Router();

// every column that can be written via POST (excludes id / created_at)
const SONG_FIELDS = [
  "absolute_path", "file_name",
  "duree", "bitrate", "sample_rate", "mode",
  "titre", "artiste", "artiste_album", "album", "date_sortie", "genre",
  "piste", "disque", "compositeur", "parolier", "editeur", "copyright",
  "encode_par", "langue", "bpm", "isrc", "commentaire", "chef_orchestre", "remixe_par",
];

const FILTERABLE_FIELDS = ["artiste", "album", "genre"];

router.post("/", (req, res) => {
  const body = req.body || {};

  if (!body.absolute_path || !body.file_name) {
    return res.status(400).json({ error: "absolute_path and file_name are required" });
  }

  const present = SONG_FIELDS.filter((field) => body[field] !== undefined);
  const existing = db.prepare("SELECT id FROM songs WHERE absolute_path = ?").get(body.absolute_path);

  if (existing) {
    const setClause = present.map((field) => `${field} = ?`).join(", ");
    const values = present.map((field) => body[field]);
    db.prepare(`UPDATE songs SET ${setClause} WHERE id = ?`).run(...values, existing.id);
    return res.status(200).json({ id: existing.id, action: "updated" });
  }

  const columns = present.join(", ");
  const placeholders = present.map(() => "?").join(", ");
  const values = present.map((field) => body[field]);
  const info = db.prepare(`INSERT INTO songs (${columns}) VALUES (${placeholders})`).run(...values);
  return res.status(201).json({ id: info.lastInsertRowid, action: "inserted" });
});

router.get("/", (req, res) => {
  const conditions = [];
  const values = [];

  for (const field of FILTERABLE_FIELDS) {
    if (req.query[field] !== undefined) {
      conditions.push(`${field} = ?`);
      values.push(req.query[field]);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM songs ${where}`).all(...values);
  res.json(rows);
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM songs WHERE id = ?").get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: "not found" });
  }
  res.json(row);
});

router.patch("/:id", (req, res) => {
  const body = req.body || {};
  const present = SONG_FIELDS.filter((field) => body[field] !== undefined);

  if (present.length === 0) {
    return res.status(400).json({ error: "no updatable fields provided" });
  }

  const setClause = present.map((field) => `${field} = ?`).join(", ");
  const values = present.map((field) => body[field]);
  const info = db.prepare(`UPDATE songs SET ${setClause} WHERE id = ?`).run(...values, req.params.id);

  if (info.changes === 0) {
    return res.status(404).json({ error: "not found" });
  }
  res.json(db.prepare("SELECT * FROM songs WHERE id = ?").get(req.params.id));
});

router.get("/:id/stream", (req, res) => {
  const row = db.prepare("SELECT absolute_path FROM songs WHERE id = ?").get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: "not found" });
  }

  let stat;
  try {
    stat = fs.statSync(row.absolute_path);
  } catch {
    return res.status(404).json({ error: "file missing on disk" });
  }

  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(row.absolute_path).pipe(res);
    return;
  }

  const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": "audio/mpeg",
  });
  fs.createReadStream(row.absolute_path, { start, end }).pipe(res);
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM songs WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "not found" });
  }
  res.json({ deleted: true });
});

module.exports = router;
