# How to run everything

This project has 5 moving parts: RabbitMQ (broker), the API, the frontend, and the
4 Python pipeline programs. The API + frontend work fine on their own (against
whatever is already in `mp3_library.db`) — the Python pipeline is only needed to
populate the library from a watched folder.

## 0. One-time setup

```bash
pip install -r requirements.txt

cd mp3_api && npm install
cd ../frontend && npm install
```

## 1. Start RabbitMQ

If it's already installed as a Windows service / already running, skip this. Check
the management UI at http://localhost:15672 (guest/guest) — if it loads, it's up.

Otherwise, with Docker:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

The 4 Python programs retry every 5s if they can't reach `localhost:5672`, so it's
fine to start them before RabbitMQ is ready.

## 2. Start the API

```bash
cd mp3_api
npm start
```

Listens on **http://localhost:8080**. Creates `mp3_api/mp3_library.db` automatically
on first run.

## 3. Start the frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in a browser. That's the whole web app — library,
playlist generator, playlists list, playlist editor/player.

## 4. (Optional) Start the Python pipeline

Only needed to feed new MP3s into the library from a watched folder. Run each in its
own terminal — order doesn't matter, they all reconnect/retry:

```bash
python programe1.py --folder New_music --interval 180   # folder watcher
python programe2.py                                       # metadata extractor
python programe3.py                                       # sends metadata to the API
python programe4.py                                       # moves the file into permanent storage
```

`programe4.py` **moves** (doesn't delete) the original file into `mp3_api/storage/`
once it's been successfully sent to the API, and updates the DB record to point at
the new location — that's what the frontend actually streams from. The watched folder
(`--folder`) still ends up empty after a file is processed, but the file itself is
preserved under `mp3_api/storage/`, not lost.

## Quick reference

| Thing | URL / command |
|---|---|
| RabbitMQ management UI | http://localhost:15672 |
| API | http://localhost:8080 |
| Frontend | http://localhost:5173 |
| Stop a `npm start`/`npm run dev` | Ctrl+C in its terminal |
| Stop a `python programeN.py` | Ctrl+C in its terminal |

## Troubleshooting

- **"address already in use" on :8080 or :5173`** — something from a previous run is
  still listening. Find and stop it:
  ```powershell
  Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
  Stop-Process -Id <pid> -Force
  ```
  (swap `8080` for `5173` for the frontend).
- **Frontend loads but the library/playlists stay empty** — the API isn't running, or
  there's nothing in `mp3_library.db` yet. Start the API, and either run the Python
  pipeline against a folder of MP3s, or `POST` a song manually:
  ```bash
  curl -X POST http://localhost:8080/api/songs -H "Content-Type: application/json" \
    -d '{"absolute_path":"C:/path/to/song.mp3","file_name":"song.mp3","titre":"Title","artiste":"Artist","genre":"Pop","duree":"3:00"}'
  ```
- **Programme 3 logs keep saying it can't reach the API / requeues forever** — the API
  isn't running, or `mp3_api`'s port changed. It'll catch up automatically once the
  API is back.
- **RabbitMQ unreachable** — all 4 Python programs print `RabbitMQ unreachable ... —
  retrying in 5s` and keep retrying; nothing to do but get RabbitMQ running.
