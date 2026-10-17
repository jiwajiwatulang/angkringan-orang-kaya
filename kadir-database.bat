@echo off
chcp 65001 >nul
cd /d "C:\Users\REZA RESTU RENGGA\.gemini\antigravity\scratch\angkringan-apk-push"
cls
node scripts\kadir-cek-database.js
echo.
echo Tekan sembarang tombol untuk membuka Owner Portal di browser...
pause >nul
start https://angkringan-orang-kaya.ranutarde.workers.dev/owner
