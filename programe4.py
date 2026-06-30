import json
import os
import shutil
import time

import pika
import requests

from mq_common import connect_with_retry, declare_queue, log

PROG_TAG = "PROG4"
QUEUE_IN = "mp3_sent"
API_URL = "http://localhost:8080/api/songs"
API_TIMEOUT = 5

STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mp3_api", "storage")


def storage_path_for(song_id, filename):
    # prefix with the DB id so two songs with the same filename never collide
    return os.path.join(STORAGE_DIR, f"{song_id}_{filename}")


def handle_message(ch, method, _properties, body):
    try:
        data = json.loads(body)
        path = data["path"]
        filename = data["filename"]
        song_id = data["id"]
    except (json.JSONDecodeError, KeyError) as exc:
        log(PROG_TAG, f"Bad message, dropping: {exc}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    new_path = storage_path_for(song_id, filename)

    if not os.path.exists(new_path):
        if not os.path.exists(path):
            log(PROG_TAG, f"Source missing and not yet in storage, dropping: {path}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        try:
            os.makedirs(STORAGE_DIR, exist_ok=True)
            shutil.move(path, new_path)
            log(PROG_TAG, f"Moved to permanent storage: {path} -> {new_path}")
        except OSError as exc:
            log(PROG_TAG, f"ERROR moving {path}: {exc} — requeued")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            return

    try:
        response = requests.patch(f"{API_URL}/{song_id}", json={"absolute_path": new_path}, timeout=API_TIMEOUT)
    except requests.RequestException as exc:
        log(PROG_TAG, f"ERROR updating API record for song {song_id}: {exc} — requeued")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        return

    if response.ok:
        log(PROG_TAG, f"Updated absolute_path for song {song_id} -> {new_path}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    else:
        log(PROG_TAG, f"ERROR HTTP {response.status_code} updating song {song_id} — requeued")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def run():
    while True:
        connection, channel = connect_with_retry(PROG_TAG)
        declare_queue(channel, QUEUE_IN)
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=QUEUE_IN, on_message_callback=handle_message)

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
