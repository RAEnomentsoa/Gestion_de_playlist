# mp3-api

REST API for storing MP3 metadata. Express + better-sqlite3 (synchronous, no ORM).

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

Listens on `http://localhost:8080`. The SQLite file `mp3_library.db` is created
automatically in this folder on first run.

## Endpoints

### Songs

- `POST /api/songs` — body: JSON with any subset of song fields. `absolute_path` and
  `file_name` are required (400 if missing). Inserts if `absolute_path` is new (201),
  updates if it already exists (200). Returns `{ id, action: "inserted" | "updated" }`.
- `GET /api/songs` — all songs as a JSON array. Optional filters: `?artiste=&album=&genre=`.
- `GET /api/songs/:id` — one song by id, 404 if not found.
- `PATCH /api/songs/:id` — body: JSON with any subset of song fields to update (same
  allowlist as `POST`). Used by `programe4.py` to repoint `absolute_path` at
  `mp3_api/storage/` after moving the file there. 400 if no updatable fields given,
  404 if the id doesn't exist, else returns the updated row.
- `GET /api/songs/:id/stream` — streams the actual mp3 bytes for that song (reads
  `absolute_path` from disk). Supports HTTP `Range` requests (206 partial content) for
  seeking. 404 if the song id doesn't exist or the file is missing on disk.
- `DELETE /api/songs/:id` — deletes by id, 404 if not found, else `{ deleted: true }`.

### Playlists

- `POST /api/playlists/generate` — body `{ genre?, target_duration_seconds }`. Returns
  a candidate `{ tracks, total_duration_seconds }` preview (genre-filtered, shuffled,
  accumulated up to the target) without saving anything.
- `POST /api/playlists` — body `{ name, owner_name, genre?, target_duration?, song_ids }`
  (ordered). Creates the playlist + its track order. 201, returns the playlist with
  embedded tracks.
- `GET /api/playlists?owner_name=` — all playlists (optionally filtered by owner), each
  with embedded ordered tracks and `total_duration_seconds`.
- `GET /api/playlists/:id` — one playlist with embedded tracks, 404 if not found.
- `PUT /api/playlists/:id` — body `{ name?, song_ids? }`. `song_ids`, if given, fully
  replaces the track order (covers add/remove/replace/reorder in one call).
- `DELETE /api/playlists/:id` — deletes the playlist (cascades to its tracks).
- `GET /api/playlists/:id/download` — streams a `.zip` of the playlist's mp3 files
  (`Content-Disposition: attachment`). Missing files on disk are skipped, not fatal.
