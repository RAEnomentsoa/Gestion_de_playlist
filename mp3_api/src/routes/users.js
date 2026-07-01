const express = require("express");
const db = require("../database");

const router = express.Router();

router.get("/", (_req, res) => {
  const users = db
    .prepare("SELECT id, name, created_at FROM users ORDER BY created_at ASC")
    .all();
  res.json(users);
});

router.post("/", (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const existing = db
    .prepare("SELECT id, name, created_at FROM users WHERE name = ?")
    .get(name);
  if (existing) {
    return res.status(409).json({ error: "Ce nom est déjà utilisé", user: existing });
  }

  const { lastInsertRowid } = db.prepare("INSERT INTO users (name) VALUES (?)").run(name);
  const user = db
    .prepare("SELECT id, name, created_at FROM users WHERE id = ?")
    .get(lastInsertRowid);
  res.status(201).json(user);
});

module.exports = router;
