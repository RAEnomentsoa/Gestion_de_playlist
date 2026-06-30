import json
import time

import pika
from mutagen.mp3 import MP3
from mutagen.easyid3 import EasyID3

from mq_common import connect_with_retry, declare_queue, log

PROG_TAG = "PROG2"
QUEUE_IN = "mp3_paths"
QUEUE_OUT = "mp3_meta"

CHANNEL_MODES = {
    0: "Stereo",
    1: "Joint Stereo",
    2: "Dual Channel",
    3: "Mono",
}


def extract_metadata(path):
    audio = MP3(path, ID3=EasyID3)
    tags = audio.tags or {}

    def tag(key):
        values = tags.get(key)
        return values[0] if values else None

    return {
        "title": tag("title"),
        "artist": tag("artist"),
        "album": tag("album"),
        "genre": tag("genre"),
        "date": tag("date"),
        "language": tag("language"),
        "duration": round(audio.info.length, 2),
        "bitrate": audio.info.bitrate // 1000,
        "sample_rate": audio.info.sample_rate,
        "mode": CHANNEL_MODES.get(audio.info.mode, str(audio.info.mode)),
    }


def make_handler(channel):
    def handle_message(ch, method, _properties, body):
        try:
            data = json.loads(body)
            path = data["path"]
            filename = data["filename"]
        except (json.JSONDecodeError, KeyError) as exc:
            log(PROG_TAG, f"Bad message, dropping: {exc}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        log(PROG_TAG, f"Received path: {path}")

        try:
            meta = extract_metadata(path)
        except Exception as exc:
            log(PROG_TAG, f"ERROR extracting metadata for {path}: {exc} — dropping")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        log(PROG_TAG, f"Extracted: title={meta['title']}, artist={meta['artist']}, "
                       f"album={meta['album']}, genre={meta['genre']}, date={meta['date']}, "
                       f"language={meta['language']}, duration={meta['duration']}, "
                       f"bitrate={meta['bitrate']}, sample_rate={meta['sample_rate']}, mode={meta['mode']}")

        out_body = json.dumps({
            "path": path,
            "filename": filename,
            "title": meta["title"],
            "artist": meta["artist"],
            "album": meta["album"],
            "genre": meta["genre"],
            "date": meta["date"],
            "language": meta["language"],
            "duration": meta["duration"],
            "bitrate": meta["bitrate"],
            "sample_rate": meta["sample_rate"],
            "mode": meta["mode"],
        })

        ch.basic_publish(
            exchange="",
            routing_key=QUEUE_OUT,
            body=out_body,
            properties=pika.BasicProperties(delivery_mode=2),
        )
        log(PROG_TAG, f"Published metadata: {filename}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    return handle_message


def run():
    while True:
        connection, channel = connect_with_retry(PROG_TAG)
        declare_queue(channel, QUEUE_IN)
        declare_queue(channel, QUEUE_OUT)
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=QUEUE_IN, on_message_callback=make_handler(channel))

        log(PROG_TAG, f"Waiting for messages on '{QUEUE_IN}'...")
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
