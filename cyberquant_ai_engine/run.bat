@echo off
title CyberQuant AI Assistant
echo ==========================================================
echo   Starting CyberQuant AI Assistant (Team Firewall Force)  
echo ==========================================================
echo.

cd /d "%~dp0"
set PYTHON_EXE=C:\Users\User\AppData\Local\Programs\Python\Python313\python.exe

if exist "%PYTHON_EXE%" (
    echo [OK] Using Python 3.13: %PYTHON_EXE%
    "%PYTHON_EXE%" "%~dp0main.py"
) else (
    echo [INFO] Python 3.13 not found at default location, trying system python...
    python "%~dp0main.py"
)

pause
