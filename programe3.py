import json
import os
import time

import pika
import requests

from mq_common import connect_with_retry, declare_queue, log

PROG_TAG = "PROG3"
QUEUE_IN = "mp3_meta"
QUEUE_OUT = "mp3_sent"
API_URL = "http://localhost:8080/api/songs"
API_TIMEOUT = 5
FAILURE_BACKOFF = 5  # avoid hot-looping while the API is down/erroring

BLACKLIST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "blackList.txt")
BLACKLIST_FIELDS = ("genre", "artist")


def load_blacklist():
    """Parse config/blackList.txt into {"genre": {...}, "artist": {...}} (lowercased).

    Format: one "key:value1,value2,..." line per field, e.g. "genre:kk".
    Missing file, empty file, or a field with no values -> nothing blacklisted for it.
    Reloaded on every message so editing the file takes effect without a restart.
    """
    blacklist = {field: set() for field in BLACKLIST_FIELDS}
    try:
        with open(BLACKLIST_PATH, "r", encoding="utf-8") as f:
            for line in f:
                key, _, values = line.strip().partition(":")
                key = key.strip().lower()
                if key not in blacklist:
                    continue
                for value in values.split(","):
                    value = value.strip().lower()
                    if value:
                        blacklist[key].add(value)
    except FileNotFoundError:
        pass
    return blacklist


def is_blacklisted(data, blacklist):
    genre = (data.get("genre") or "").strip().lower()
    artist = (data.get("artist") or "").strip().lower()
    return bool((genre and genre in blacklist["genre"]) or (artist and artist in blacklist["artist"]))


def format_duration(seconds):
    """seconds (float) -> 'm:ss' or 'h:mm:ss', matching the API's duree column format."""
    if seconds is None:
        return None
    minutes, secs = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02}:{secs:02}"
    return f"{minutes}:{secs:02}"


def build_payload(data):
    """Map mp3_meta's English fields to the API's schema.sql French column names."""
    payload = {
        "absolute_path": data.get("path"),
        "file_name": data.get("filename"),
        "titre": data.get("title"),
        "artiste": data.get("artist"),
        "album": data.get("album"),
        "genre": data.get("genre"),
        "date_sortie": data.get("date"),
        "duree": format_duration(data.get("duration")),
    }
    bitrate = data.get("bitrate")
    if bitrate is not None:
        payload["bitrate"] = f"{bitrate} kbps"
    sample_rate = data.get("sample_rate")
    if sample_rate is not None:
        payload["sample_rate"] = f"{sample_rate} Hz"
    if data.get("mode") is not None:
        payload["mode"] = data["mode"]
    return {k: v for k, v in payload.items() if v is not None or k in ("absolute_path", "file_name")}


def make_handler(channel):
    def handle_message(ch, method, _properties, body):
        try:
            data = json.loads(body)
        except json.JSONDecodeError as exc:
            log(PROG_TAG, f"Bad message, dropping: {exc}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        path = data.get("path")
        filename = data.get("filename")

        blacklist = load_blacklist()
        if is_blacklisted(data, blacklist):
            log(PROG_TAG, f"Blacklisted (genre={data.get('genre')}, artist={data.get('artist')}) "
                           f"— skipping: {filename}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        payload = build_payload(data)

        log(PROG_TAG, f"Sending {filename} to API...")

        try:
            response = requests.post(API_URL, json=payload, timeout=API_TIMEOUT)
        except requests.RequestException as exc:
            log(PROG_TAG, f"ERROR sending {filename}: {exc} — requeued")
            time.sleep(FAILURE_BACKOFF)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            return

        if response.ok:
            song_id = response.json().get("id")
            out_body = json.dumps({"path": path, "filename": filename, "id": song_id})
            ch.basic_publish(
                exchange="",
                routing_key=QUEUE_OUT,
                body=out_body,
                properties=pika.BasicProperties(delivery_mode=2),
            )
            log(PROG_TAG, f"Sent OK → queued for storage move: {path}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
        else:
            log(PROG_TAG, f"ERROR HTTP {response.status_code} for {filename} — requeued")
            time.sleep(FAILURE_BACKOFF)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    return handle_message


def run():
    while True:
        connection, channel = connect_with_retry(PROG_TAG)
        declare_queue(channel, QUEUE_IN)
        declare_queue(channel, QUEUE_OUT)
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=QUEUE_IN, on_message_callback=make_handler(channel))

        log(PROG_TAG, f"Waiting for messages on '{QUEUE_IN}' — API target: {API_URL}")
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            channel.stop_consuming()
            connection.close()
            log(PROG_TAG, "Stopped.")
            return
        except (pika.exceptions.AMQPConnectionError,
                pika.exceptions.StreamLostError,
                pika.exceptions.ChannelClosedByBroker) as exc:
            log(PROG_TAG, f"Connection lost ({exc}) — reconnecting in 5s")
            time.sleep(5)


if __name__ == "__main__":
    run()
