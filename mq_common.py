import sys
import time
from datetime import datetime

import pika

# Windows consoles default to a legacy codepage (e.g. cp1252) that can't encode
# characters like "→" used in the log format — force UTF-8 so logging never crashes.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

RABBITMQ_HOST = "localhost"
RABBITMQ_PORT = 5672
RETRY_DELAY = 5  # seconds, used for every "connection lost" retry loop


def timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log(prog_tag, message):
    print(f"[{prog_tag} | {timestamp()}] {message}", flush=True)


def connect_with_retry(prog_tag):
    """Block until a connection + channel to RabbitMQ is established."""
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=RABBITMQ_HOST,
                    port=RABBITMQ_PORT,
                    heartbeat=600,
                    blocked_connection_timeout=300,
                )
            )
            channel = connection.channel()
            return connection, channel
        except pika.exceptions.AMQPConnectionError as exc:
            log(prog_tag, f"RabbitMQ unreachable ({exc}) — retrying in {RETRY_DELAY}s")
            time.sleep(RETRY_DELAY)


def declare_queue(channel, name):
    channel.queue_declare(queue=name, durable=True)
