# Gestion_de_playlist
ITU Projet bonus Mr Naina

## MP3 pipeline (implemented)

Four independent Python programs, decoupled through RabbitMQ, plus a Node.js REST API.
No program ever calls another directly — they only publish/consume queue messages.

```
[Programme 1]  --mp3_paths-->  [Programme 2]  --mp3_meta-->  [Programme 3]  --mp3_sent-->  [Programme 4]
 folder watcher                 metadata extractor          API sender (POST)            storage mover
                                                                   |                            |
                                                                   v                            v
                                                          [mp3-api]  (Express + better-sqlite3, :8080)
```

- **Programme 1** (`programe1.py`) scans a folder recursively for `.mp3` files and
  publishes new/duplicate paths to `mp3_paths`.
- **Programme 2** (`programe2.py`) consumes `mp3_paths`, extracts tags via `mutagen`
  (title, artist, album, genre, date, duration, bitrate, sample_rate, mode), publishes
  to `mp3_meta`.
- **Programme 3** (`programe3.py`) consumes `mp3_meta` and `POST`s to
  `http://localhost:8080/api/songs`, mapping fields to the API's French column names
  (`titre`, `artiste`, `date_sortie`, `duree`, ...). On a 2xx response it reads the
  returned `id` and publishes `{path, filename, id}` to `mp3_sent`; on failure it
  `nack`s with `requeue=True`.
- **Programme 4** (`programe4.py`) consumes `mp3_sent` and **moves** the file into
  `mp3_api/storage/` (renamed `{id}_{filename}` to avoid collisions) instead of
  deleting it, then `PATCH`es `/api/songs/:id` so the DB's `absolute_path` follows the
  file to its new location. This keeps the watched folder clean (the original
  requirement) while keeping the file streamable/playable from the frontend — deleting
  it outright broke playback, since the API streams audio straight from
  `absolute_path` on disk.
- **mp3-api** (`mp3_api/`) — Express + better-sqlite3 REST API storing metadata in
  `mp3_library.db`, matching `schema.sql`. Also exposes playlist endpoints
  (`/api/playlists`: generate/save/list/detail/edit/delete/download-zip) and audio
  streaming (`/api/songs/:id/stream`, with HTTP Range support). See
  [mp3_api/README.md](mp3_api/README.md).
- **frontend** (`frontend/`) — Vue 3 web app (Spotify-style dark UI) for browsing the
  song library, generating/saving/editing playlists, listening in-browser, and
  downloading playlists as zip. See the "Frontend" section below.

### Setup

```bash
pip install -r requirements.txt
cd mp3_api && npm install
cd ../frontend && npm install
```

### RabbitMQ

Already running locally on `localhost:5672` (management UI at http://localhost:15672).
If you ever need to spin one up instead:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

All four Python programs connect to `localhost:5672` and retry every 5s if the broker
is unreachable.

### Running everything

Run each in its own terminal (order doesn't matter — they reconnect/retry):

```bash
cd mp3_api && npm start                                   # REST API on :8080
cd frontend && npm run dev                                # web app on :5173

python programe1.py --folder New_music --interval 180   # folder watcher
python programe2.py                                       # metadata extractor
python programe3.py                                       # API sender
python programe4.py                                       # deleter
```

Then open http://localhost:5173. The Python pipeline (programe1-4) is only needed to
populate the library from a watched folder — the frontend and API work on their own
against whatever is already in `mp3_library.db`.

- `--folder` (required): folder to scan recursively for `.mp3` files.
- `--interval` (optional, default `180`): seconds between scans.
- Programmes 2-4 take no CLI args — they're pure queue consumers.

## Frontend (`frontend/`)

Vue 3 (Composition API, `<script setup>`) + Pinia + Vue Router + Vite. Plain CSS with
CSS variables for a Spotify-inspired dark theme — no UI-kit dependency.

- **Bibliothèque** (`/library`) — CRUD over `/api/songs` (edit metadata, delete from
  the catalog; doesn't touch the file on disk).
- **Générer une playlist** (`/generate`) — pick a genre + target duration, preview the
  generated tracks with checkboxes to include/exclude, name it, save.
- **Mes playlists** (`/playlists`) — every saved playlist as a row with its own
  play/pause button and a single progress bar spanning the *combined* duration of all
  its tracks, auto-advancing track-to-track.
- **Playlist detail** (`/playlists/:id`) — reorder tracks (↑/↓), remove a track, add
  one from the library, save; play/pause with the same combined progress bar; download
  as `.zip`; delete the playlist.
- "User" is just a display name typed once in the sidebar (stored in `localStorage`,
  sent as `owner_name`) — no real authentication.
- The combined sequential player (`src/stores/player.js`) drives a single shared
  `Audio()` for the whole app — starting a new playlist stops whatever else was
  playing, same as Spotify.

### Logs

Every program prefixes its logs with `[PROGx | timestamp]`, e.g.:

```
[PROG1 | 2026-01-15 14:32:01] Found new MP3: /music/song.mp3
[PROG2 | 2026-01-15 14:32:02] Extracted: title=Song, artist=Artist
[PROG3 | 2026-01-15 14:32:03] Sent OK → queued for storage move: /music/song.mp3
[PROG4 | 2026-01-15 14:32:03] Moved to permanent storage: /music/song.mp3 -> .../mp3_api/storage/4_song.mp3
```

---

## Specs / notes (project history)

Language : python
todo:


programe1: no interface 
a program that checks if there is new music in a spesific folder  
-it gets its list of absolute path
-have to be an mp3 only 
- listen permanently to this specific folder if new mp3 are comming in or we can configure it like evry 5 min 5 seconde or anything 


program2:

just listen to incomin list of music from programm 1 
and does metadata extraction (there is a lib that does that)  like date de sortie durree ,arist, ... all available metadata 

list it for each mp3 (available metadata)



prompt 


Build a Python MP3 pipeline with 3 independent programs communicating via RabbitMQ.

## Architecture
3 programs + RabbitMQ broker (via pika lib). Async, decoupled — programs never call each other directly.

---

## Programme 1 — Folder watcher (main entry point, standalone)
- Args: --folder <path> --interval <seconds, default 180>
- Scans folder recursively for .mp3 files every <interval> seconds
- Detects: new files (not seen before) and duplicate copies (same name, different path)
- Publishes to Queue "mp3_paths": { "path": absolute_path, "filename": name }
- Keeps an in-memory set of already-published paths (no re-publish on next scan)
- Logs: timestamp, file found, published/skipped

---

## Programme 2 — Metadata extractor
- Consumes Queue "mp3_paths"
- Extracts via mutagen: title, artist, album, genre, date, duration, bitrate, sample_rate
- Publishes to Queue "mp3_meta": { "path", "filename", "title", "artist", "album", "genre", "date", "duration", "bitrate" }
- Logs: received path, extracted fields, published

---

## Programme 3 — API sender
- Args: (receives from queue, no CLI args needed)
- Consumes Queue "mp3_meta"
- Sends metadata to API via GET request: GET http://localhost:8080/api/mp3?title=...&artist=...&...
- On HTTP 200: delete the original file from disk, basic_ack
- On error: basic_nack with requeue=True, log error
- Logs: sending, success+deleted / failure+requeued

---

## RabbitMQ config (all 3 programs)
- Host: localhost, port 5672
- Both queues: durable=True, delivery_mode=2, prefetch_count=1
- Reconnect on connection lost (simple retry loop with 5s sleep)

---

## Logging format (all programs)
[PROG1 | 2026-01-15 14:32:01] Found new MP3: /music/song.mp3
[PROG2 | 2026-01-15 14:32:02] Extracted: title=Song, artist=Artist
[PROG3 | 2026-01-15 14:32:03] Sent OK → deleted /music/song.mp3

---

## File structure
mp3_pipeline/
├── prog1_watcher.py
├── prog2_extractor.py
├── prog3_sender.py
├── requirements.txt       # pika, mutagen, requests
└── README.md              # how to run each program + docker command for RabbitMQ


api:

Build a REST API in Node.js (Express) with SQLite for storing MP3 metadata.

## Stack
- Node.js + Express
- better-sqlite3 (synchronous, simpler)
- No ORM

## Database
SQLite file: mp3_library.db
Create this exact table on startup:

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

---

## Endpoints

### POST /api/songs
- Body: JSON with any subset of song fields
- absolute_path + file_name required, return 400 if missing
- If absolute_path already exists: UPDATE
- If not: INSERT
- Returns: { id, action: "inserted" | "updated" }

### GET /api/songs
- Returns all songs as JSON array
- Optional filters via query params: ?artiste=X&album=Y&genre=Z

### GET /api/songs/:id
- Returns one song by id
- 404 if not found

### DELETE /api/songs/:id
- Deletes by id
- Returns { deleted: true }

---

## File structure
mp3_api/
├── src/
│   ├── app.js          # Express setup
│   ├── database.js     # DB init + better-sqlite3 instance
│   └── routes/
│       └── songs.js    # all /api/songs routes
├── package.json
└── README.md           # npm install, npm start

## Notes
- Port 8080
- Use better-sqlite3 (not node-sqlite3, not async)
- Proper HTTP status codes: 200, 201, 400, 404
- All responses JSON