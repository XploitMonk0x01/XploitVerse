@echo off
title XploitVerse Tactical Launcher
echo Launching XploitVerse Stack via PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Launcher exited with error code %ERRORLEVEL%
    pause
)
