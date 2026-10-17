@echo off
chcp 65001 >nul
title [PT SAKUNOTA] MEJA KENDALI PAK CEO
:MENU
cls
echo ======================================================
echo       🏢 PT SAKUNOTA SEJAHTERA - MEJA KENDALI CEO
echo       👑 Pemilik: Pak CEO
echo ======================================================
echo.
echo   [1] PAIJO   - Jalankan 198 Unit Test dan Robot Playwright
echo   [2] SLAMET  - Build Next.js dan Deploy ke Cloudflare
echo   [3] MUTINO  - Razia Keamanan API dan Cek Gembok Owner (401)
echo   [4] SUPARDO - Buka Demo Sandbox Kasir di Browser
echo   [5] TEJO    - Buka Buku Panduan dan Legalitas di Browser
echo   [6] KANTOR  - Cek Status Git dan Commit Terakhir
echo   [0] Keluar
echo.
echo ======================================================
set /p PILIHAN="Pilih karyawan yang mau diperintah [0-6]: "

if "%PILIHAN%"=="1" goto JALANKAN_PAIJO
if "%PILIHAN%"=="2" goto JALANKAN_SLAMET
if "%PILIHAN%"=="3" goto JALANKAN_MUTINO
if "%PILIHAN%"=="4" goto JALANKAN_SUPARDO
if "%PILIHAN%"=="5" goto JALANKAN_TEJO
if "%PILIHAN%"=="6" goto JALANKAN_STATUS
if "%PILIHAN%"=="0" goto KELUAR
goto MENU

:JALANKAN_PAIJO
cls
call paijo-cek.bat
goto MENU

:JALANKAN_SLAMET
cls
call slamet-deploy.bat
goto MENU

:JALANKAN_MUTINO
cls
echo ======================================================
echo    PT SAKUNOTA SEJAHTERA - DIVISI KEAMANAN DAN API
echo    Petugas: Mutino (Satpam dan Intel Keamanan)
echo ======================================================
echo.
node scripts\mutino-cek-keamanan.js
echo.
pause
goto MENU

:JALANKAN_SUPARDO
echo.
echo ☕ [SUPARDO] Membuka Demo Sandbox Kasir di browser Anda...
start https://angkringan-orang-kaya.ranutarde.workers.dev/pos?demo=true
timeout /t 2 >nul
goto MENU

:JALANKAN_TEJO
echo.
echo 📖 [TEJO] Membuka Buku Panduan Lengkap SakuNota di browser...
start https://angkringan-orang-kaya.ranutarde.workers.dev/panduan
timeout /t 2 >nul
goto MENU

:JALANKAN_STATUS
cls
call status-kantor.bat
goto MENU

:KELUAR
exit
