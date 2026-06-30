@echo off
REM Starts the RabbitMQ Windows service. It's set to start automatically with
REM Windows, so you'll only need this if you stopped it manually.
REM Requires Administrator - this self-elevates (UAC prompt) if needed.

net session >nul 2>&1
if %errorLevel% == 0 (
    goto :run
) else (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:run
net start RabbitMQ
echo.
echo Management UI: http://localhost:15672 (guest/guest)
pause
