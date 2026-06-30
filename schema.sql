CREATE TABLE IF NOT EXISTS songs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- file
    absolute_path   TEXT    NOT NULL UNIQUE,
    file_name       TEXT    NOT NULL,

    -- audio info
    duree           TEXT,           -- e.g. "3:32"
    bitrate         TEXT,           -- e.g. "320 kbps"
    sample_rate     TEXT,           -- e.g. "48000 Hz"
    mode            TEXT,           -- Stereo / Joint Stereo / Mono

    -- ID3 tags
    titre           TEXT,
    artiste         TEXT,
    artiste_album   TEXT,
    album           TEXT,
    date_sortie     TEXT,
    genre           TEXT,
    piste           TEXT,           -- e.g. "3/12"
    disque          TEXT,           -- e.g. "1/2"
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
    owner_name      TEXT    NOT NULL,   -- display name typed by the visitor, no real auth
    genre           TEXT,               -- generation criteria, kept for reference
    target_duration INTEGER,            -- seconds, generation criteria
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id     INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id         INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL    -- 0-based order within the playlist
);
