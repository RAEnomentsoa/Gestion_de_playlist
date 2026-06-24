import os
import time

# ── settings ──────────────────────────────────────────────
FOLDER        = "New_music"   # folder to watch
SCAN_INTERVAL = 5             # seconds between each scan
# ──────────────────────────────────────────────────────────


def get_mp3_paths(folder):
    """Return a set of absolute paths for every .mp3 file in the folder."""
    paths = set()
    for file in os.scandir(folder):
        if file.is_file() and file.name.lower().endswith(".mp3"):
            paths.add(os.path.abspath(file.path))
    return paths


def watch_folder():
    """
    Scan the folder every SCAN_INTERVAL seconds.
    Print paths that were added or removed since the last scan.
    """
    folder = os.path.abspath(FOLDER)

    # make sure the folder exists before we start
    if not os.path.isdir(folder):
        print(f"ERROR: folder '{folder}' does not exist.")
        return

    print(f"[prog1] Watching '{folder}' every {SCAN_INTERVAL}s — Ctrl+C to stop")
    print("-" * 60)

    # first scan: remember what is already there
    known_paths = get_mp3_paths(folder)
    print(f"[prog1] Found {len(known_paths)} MP3(s) at startup:")
    for path in sorted(known_paths):
        print(f"        {path}")
    print()

    while True:
        time.sleep(SCAN_INTERVAL)

        current_paths = get_mp3_paths(folder)

        new_paths     = current_paths - known_paths   # files that appeared
        removed_paths = known_paths   - current_paths # files that disappeared

        for path in sorted(new_paths):
            print(f"[prog1] NEW     {path}")

        for path in sorted(removed_paths):
            print(f"[prog1] REMOVED {path}")

        # update what we know
        if new_paths or removed_paths:
            known_paths = current_paths


# ── entry point ───────────────────────────────────────────
try:
    watch_folder()
except KeyboardInterrupt:
    print("\n[prog1] Stopped.")
