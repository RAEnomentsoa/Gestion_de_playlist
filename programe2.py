import os
import time
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, ID3NoHeaderError

# ── settings ──────────────────────────────────────────────
FOLDER        = "New_music"   # folder to watch
SCAN_INTERVAL = 5             # seconds between each scan
# ──────────────────────────────────────────────────────────

# maps raw ID3 frame codes → readable label
ID3_FRAME_LABELS = {
    "TIT2": "Titre",
    "TPE1": "Artiste",
    "TPE2": "Artiste album",
    "TALB": "Album",
    "TDRC": "Date de sortie",
    "TYER": "Annee",
    "TCON": "Genre",
    "TRCK": "Piste",
    "TCOM": "Compositeur",
    "TCOP": "Copyright",
    "TENC": "Encode par",
    "TBPM": "BPM",
    "TSRC": "ISRC",
    "TSSE": "Encodeur logiciel",
}

# maps mutagen's mode integer → human-readable string
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
    """
    Read audio info and ID3 tags from an MP3 file.
    Returns a dict of label → value for every field that exists.
    """
    metadata = {}

    # ── audio stream info (always available) ──────────────
    try:
        audio = MP3(path)
        metadata["Duree"]       = seconds_to_duration(audio.info.length)
        metadata["Bitrate"]     = f"{audio.info.bitrate // 1000} kbps"
        metadata["Sample rate"] = f"{audio.info.sample_rate} Hz"
        metadata["Mode"]        = CHANNEL_MODES.get(audio.info.mode, str(audio.info.mode))
    except Exception:
        pass

    # ── ID3 tags (artist, title, genre, …) ────────────────
    try:
        tags = ID3(path)
        for frame_code, label in ID3_FRAME_LABELS.items():
            frame = tags.get(frame_code)
            if frame is None:
                continue
            # most frames store their value in a .text list
            if hasattr(frame, "text"):
                value = ", ".join(str(v) for v in frame.text if str(v).strip())
            else:
                value = str(frame).strip()
            if value:
                metadata[label] = value
    except ID3NoHeaderError:
        pass   # file has no ID3 header at all — that's fine

    return metadata


def print_metadata(path, metadata):
    """Print a song's path and all its metadata in a readable table."""
    filename = os.path.basename(path)
    print(f"\n{'─' * 60}")
    print(f"  {filename}")
    print(f"  {path}")
    print(f"{'─' * 60}")

    if not metadata:
        print("  (no metadata found)")
        return

    # align values in a column
    longest_label = max(len(label) for label in metadata)
    for label, value in metadata.items():
        print(f"  {label:<{longest_label}}  {value}")


def watch_folder():
    """
    Scan the folder every SCAN_INTERVAL seconds.
    For every new MP3 found, extract and print its metadata.
    """
    folder = os.path.abspath(FOLDER)

    if not os.path.isdir(folder):
        print(f"ERROR: folder '{folder}' does not exist.")
        return

    print(f"[prog2] Watching '{folder}' every {SCAN_INTERVAL}s — Ctrl+C to stop")
    print("-" * 60)

    # first scan: show metadata for all files already present
    known_paths = get_mp3_paths(folder)
    print(f"[prog2] Found {len(known_paths)} MP3(s) at startup:\n")
    for path in sorted(known_paths):
        metadata = extract_metadata(path)
        print_metadata(path, metadata)

    print()

    while True:
        time.sleep(SCAN_INTERVAL)

        current_paths = get_mp3_paths(folder)
        new_paths     = current_paths - known_paths

        for path in sorted(new_paths):
            print(f"\n[prog2] NEW FILE DETECTED:")
            metadata = extract_metadata(path)
            print_metadata(path, metadata)

        if new_paths:
            known_paths = current_paths


# ── entry point ───────────────────────────────────────────
try:
    watch_folder()
except KeyboardInterrupt:
    print("\n[prog2] Stopped.")
