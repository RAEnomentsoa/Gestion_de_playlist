import os
import time
import requests
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, ID3NoHeaderError

# ── settings ──────────────────────────────────────────────
FOLDER        = "New_music"                      # folder to watch
SCAN_INTERVAL = 5                                # seconds between each scan
API_URL       = "http://localhost:8000/api/track" # API endpoint (not built yet)
# ──────────────────────────────────────────────────────────

ID3_FRAME_LABELS = {
    "TIT2": "Titre",
    "TPE1": "Artiste",
    "TPE2": "Artiste_album",
    "TALB": "Album",
    "TDRC": "Date_sortie",
    "TYER": "Annee",
    "TCON": "Genre",
    "TRCK": "Piste",
    "TCOM": "Compositeur",
    "TCOP": "Copyright",
    "TENC": "Encode_par",
    "TBPM": "BPM",
    "TSRC": "ISRC",
    "TSSE": "Encodeur",
}

CHANNEL_MODES = {
    0: "Stereo",
    1: "Joint Stereo",
    2: "Dual Channel",
    3: "Mono",
}


def get_mp3_paths(folder):
    """Return a set of absolute paths for every .mp3 file in the folder."""
    paths = set()
    for file in os.scandir(folder):
        if file.is_file() and file.name.lower().endswith(".mp3"):
            paths.add(os.path.abspath(file.path))
    return paths


def seconds_to_duration(total_seconds):
    """Convert a float number of seconds to a 'm:ss' or 'h:mm:ss' string."""
    minutes, seconds = divmod(int(total_seconds), 60)
    hours,   minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02}:{seconds:02}"
    return f"{minutes}:{seconds:02}"


def extract_metadata(path):
    """Read audio info and ID3 tags. Returns a dict of label → value."""
    metadata = {}

    try:
        audio = MP3(path)
        metadata["Duree"]       = seconds_to_duration(audio.info.length)
        metadata["Bitrate"]     = f"{audio.info.bitrate // 1000} kbps"
        metadata["Sample_rate"] = f"{audio.info.sample_rate} Hz"
        metadata["Mode"]        = CHANNEL_MODES.get(audio.info.mode, str(audio.info.mode))
    except Exception:
        pass

    try:
        tags = ID3(path)
        for frame_code, label in ID3_FRAME_LABELS.items():
            frame = tags.get(frame_code)
            if frame is None:
                continue
            if hasattr(frame, "text"):
                value = ", ".join(str(v) for v in frame.text if str(v).strip())
            else:
                value = str(frame).strip()
            if value:
                metadata[label] = value
    except ID3NoHeaderError:
        pass

    return metadata


def send_to_api(path, metadata):
    """
    Send metadata + file path to the API as query parameters.
    Example request:
      GET http://localhost:8000/api/track?absolute_path=...&Titre=...&Artiste=...
    """
    # combine path and metadata into one dict for the request
    params = {"absolute_path": path}
    params.update(metadata)

    try:
        response = requests.get(API_URL, params=params, timeout=5)
        print(f"[prog3] API {response.status_code} — {os.path.basename(path)}")

    except requests.ConnectionError:
        # API not running yet — that's expected for now
        print(f"[prog3] API OFFLINE — {os.path.basename(path)}")

    except requests.Timeout:
        print(f"[prog3] API TIMEOUT — {os.path.basename(path)}")


def watch_folder():
    """
    Scan the folder every SCAN_INTERVAL seconds.
    For every new MP3 found, extract metadata and send it to the API.
    """
    folder = os.path.abspath(FOLDER)

    if not os.path.isdir(folder):
        print(f"ERROR: folder '{folder}' does not exist.")
        return

    print(f"[prog3] Watching '{folder}' every {SCAN_INTERVAL}s — Ctrl+C to stop")
    print(f"[prog3] API target: {API_URL}")
    print("-" * 60)

    # first scan: send all existing files to the API
    known_paths = get_mp3_paths(folder)
    print(f"[prog3] Found {len(known_paths)} MP3(s) at startup — sending to API:\n")
    for path in sorted(known_paths):
        metadata = extract_metadata(path)
        send_to_api(path, metadata)

    print()

    while True:
        time.sleep(SCAN_INTERVAL)

        current_paths = get_mp3_paths(folder)
        new_paths     = current_paths - known_paths

        for path in sorted(new_paths):
            print(f"\n[prog3] NEW FILE — sending to API:")
            metadata = extract_metadata(path)
            send_to_api(path, metadata)

        if new_paths:
            known_paths = current_paths


# ── entry point ───────────────────────────────────────────
try:
    watch_folder()
except KeyboardInterrupt:
    print("\n[prog3] Stopped.")
