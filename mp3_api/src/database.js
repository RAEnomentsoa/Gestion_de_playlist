const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "..", "mp3_library.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      absolute_path   TEXT    NOT NULL UNIQUE,
      file_name       TEXT    NOT NULL,
      duree           TEXT,
      bitrate         TEXT,
      sample_rate     TEXT,
      mode            TEXT,
      titre           TEXT,
      artiste         TEXT,
      artiste_album   TEXT,
      album           TEXT,
      date_sortie     TEXT,
      genre           TEXT,
      piste           TEXT,
      disque          TEXT,
      compositeur     TEXT,
      parolier        TEXT,
      editeur         TEXT,
      copyright       TEXT,
      encode_par      TEXT,
      langue          TEXT,
      bpm             TEXT,
      isrc            TEXT,
      commentaire     TEXT,
      chef_orchestre  TEXT,
      remixe_par      TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlists (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      owner_name      TEXT    NOT NULL,
      genre           TEXT,
      target_duration INTEGER,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id     INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      song_id         INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      position        INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
