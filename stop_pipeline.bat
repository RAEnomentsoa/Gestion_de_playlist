@echo off
REM Closes the 4 console windows opened by run_pipeline.bat (matched by window title).

taskkill /FI "WINDOWTITLE eq PROG1 - Folder Watcher" /T /F
taskkill /FI "WINDOWTITLE eq PROG2 - Metadata Extractor" /T /F
taskkill /FI "WINDOWTITLE eq PROG3 - API Sender" /T /F
taskkill /FI "WINDOWTITLE eq PROG4 - Storage Mover" /T /F

echo Done.
