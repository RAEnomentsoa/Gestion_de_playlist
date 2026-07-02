import argparse
import json
import os
import sys
import time

import pika

from mq_common import connect_with_retry, declare_queue, log

PROG_TAG = "PROG1"
QUEUE_PATHS = "mp3_paths"


def scan_mp3_files(folder):
    """Recursively return absolute paths of every .mp3 file under folder."""
    found = []
    for root, _, files in os.walk(folder):
        for name in files:
            if name.lower().endswith(".mp3"):
                found.append(os.path.abspath(os.path.join(root, name)))
    return found


def publish_path(channel, path, filename):
    body = json.dumps({"path": path, "filename": filename})
    channel.basic_publish(
        exchange="",
        routing_key=QUEUE_PATHS,
        body=body,
        properties=pika.BasicProperties(delivery_mode=2),
    )


def run(folder, interval):
    folder = os.path.abspath(folder)
    if not os.path.isdir(folder):
        log(PROG_TAG, f"ERROR: folder '{folder}' does not exist.")
        sys.exit(1)

    published_paths = set()  # paths already sent — never re-published in this session
    seen_filenames = set()   # filenames already seen — used for duplicate detection

    log(PROG_TAG, f"Watching '{folder}' recursively every {interval}s")

    connection, channel = connect_with_retry(PROG_TAG)
    declare_queue(channel, QUEUE_PATHS)

    try:
        while True:
            # Keep only paths that are gone from disk (successfully moved by prog4).
            # Paths still present were blocked by a filter — remove them so they
            # get re-queued and retried if the filter changed.
            published_paths = {p for p in published_paths if not os.path.exists(p)}

            new_count = duplicate_count = skipped_count = 0

            for path in scan_mp3_files(folder):
                filename = os.path.basename(path)

                if path in published_paths:
                    skipped_count += 1
                    continue

                is_duplicate = filename in seen_filenames
                kind = "duplicate" if is_duplicate else "new"
                log(PROG_TAG, f"Found {kind} MP3: {path}")

                while True:
                    try:
                        publish_path(channel, path, filename)
                        break
                    except (pika.exceptions.AMQPConnectionError,
                            pika.exceptions.ChannelWrongStateError,
                            pika.exceptions.StreamLostError) as exc:
                        log(PROG_TAG, f"Connection lost while publishing ({exc}) — reconnecting in 5s")
                        time.sleep(5)
                        connection, channel = connect_with_retry(PROG_TAG)
                        declare_queue(channel, QUEUE_PATHS)

                published_paths.add(path)
                seen_filenames.add(filename)
                if is_duplicate:
                    duplicate_count += 1
                else:
                    new_count += 1
                log(PROG_TAG, f"Published: {path}")

            log(PROG_TAG,
                f"Scan complete: {new_count} new, {duplicate_count} duplicate, "
                f"{skipped_count} already published (skipped)")

            connection.sleep(interval)
    except KeyboardInterrupt:
        log(PROG_TAG, "Stopped.")
    finally:
        try:
            connection.close()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser(description="Programme 1 — MP3 folder watcher")
    parser.add_argument("--folder", required=True, help="Folder to scan recursively for .mp3 files")
    parser.add_argument("--interval", type=int, default=180, help="Seconds between scans (default: 180)")
    args = parser.parse_args()
    run(args.folder, args.interval)


if __name__ == "__main__":
    main()
