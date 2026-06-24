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
