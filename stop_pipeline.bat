@echo off
REM Stops all 4 MP3 pipeline programs and closes their console windows.
REM Matches by command-line pattern — reliable regardless of window title changes.

powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'programe[1-4]\.py' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Done.
pause
