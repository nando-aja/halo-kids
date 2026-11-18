@echo off
title HaloKids Backend Server
cd /d "%~dp0backend"
echo ==============================================
echo Menjalankan Backend HaloKids (FastAPI/Port 8000)
echo Pastikan MySQL di XAMPP sudah aktif (Port 3306)
echo ==============================================
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
