@echo off
REM Launches all 4 MP3 pipeline programs, each in its own console window.
REM RabbitMQ and the API don't need to be up first - all 4 programs retry/reconnect.

cd /d "%~dp0"

start "PROG1 - Folder Watcher" cmd /k python programe1.py --folder New_music --interval 180
start "PROG2 - Metadata Extractor" cmd /k python programe2.py
start "PROG3 - API Sender" cmd /k python programe3.py
start "PROG4 - Storage Mover" cmd /k python programe4.py

echo Launched PROG1-4, each in its own window.
