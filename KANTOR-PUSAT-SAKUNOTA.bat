@echo off
chcp 65001 >nul
title [PT SAKUNOTA] MEJA KENDALI PAK CEO
:MENU
cls
echo ======================================================================
echo          🏢 PT SAKUNOTA SEJAHTERA - MEJA KENDALI UTAMA CEO
echo          👑 Pemilik: Pak CEO Reza
echo ======================================================================
echo.
echo   [1] PAIJO   - Uji Kualitas (198 Unit Tests ^& Robot Playwright)
echo   [2] SLAMET  - DevOps (Build Next.js ^& Deploy ke Cloudflare Workers)
echo   [3] MUTINO  - Satpam Keamanan (Razia Gembok 401 ^& Celah API)
echo   [4] KADIR   - Cloud Database (Cek D1, Lisensi, Sync ^& Owner Portal)
echo   [5] SUPARDO - UI Kasir (Buka Sandbox Kasir Mode Putih-Biru)
echo   [6] TEJO    - Dokumentasi (Buka Buku Panduan ^& Legalitas Ramah UMKM)
echo   [7] WARDI   - Desain Struk (Cek Template Cetak Thermal ^& Anti-Fraud)
echo   [8] BAMBANG - Offline Specialist (Periksa Status Cache PWA ^& Dexie)
echo   [9] STATUS  - Cek Kondisi Seluruh Kantor ^& Status Git Terkini
echo   [0] Keluar
echo.
echo ======================================================================
set /p PILIHAN="Perintahkan Karyawan [0-9]: "

if "%PILIHAN%"=="1" goto JALANKAN_PAIJO
if "%PILIHAN%"=="2" goto JALANKAN_SLAMET
if "%PILIHAN%"=="3" goto JALANKAN_MUTINO
if "%PILIHAN%"=="4" goto JALANKAN_KADIR
if "%PILIHAN%"=="5" goto JALANKAN_SUPARDO
if "%PILIHAN%"=="6" goto JALANKAN_TEJO
if "%PILIHAN%"=="7" goto JALANKAN_WARDI
if "%PILIHAN%"=="8" goto JALANKAN_BAMBANG
if "%PILIHAN%"=="9" goto JALANKAN_STATUS
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
echo ======================================================================
echo    🛡️  DIVISI KEAMANAN DAN API - PETUGAS: MUTINO
echo ======================================================================
echo.
node scripts\mutino-cek-keamanan.js
echo.
pause
goto MENU

:JALANKAN_KADIR
cls
echo ======================================================================
echo    🗄️  DIVISI CLOUD DATABASE & LISENSI - PETUGAS: KADIR
echo ======================================================================
echo.
node scripts\kadir-cek-database.js
echo.
echo [1] Buka Owner Portal di Browser Sekarang
echo [2] Kembali ke Meja Kendali
echo.
set /p KADIR_PILIH="Pilihan Anda [1/2]: "
if "%KADIR_PILIH%"=="1" (
  start https://angkringan-orang-kaya.ranutarde.workers.dev/owner
)
goto MENU

:JALANKAN_SUPARDO
echo.
echo ☕ [SUPARDO] Membuka Sandbox Kasir Mode Putih-Biru di browser...
start https://angkringan-orang-kaya.ranutarde.workers.dev/pos?demo=true
timeout /t 2 >nul
goto MENU

:JALANKAN_TEJO
echo.
echo 📖 [TEJO] Membuka Buku Panduan Kasir Ramah UMKM di browser...
start https://angkringan-orang-kaya.ranutarde.workers.dev/panduan
timeout /t 2 >nul
goto MENU

:JALANKAN_WARDI
cls
echo ======================================================================
echo    🖨️  DIVISI DESAIN STRUK & PRINTING - PETUGAS: WARDI
echo ======================================================================
echo.
echo   • Nama Brand Default    : SakuNota (Bukan POS)
echo   • Watermark Struk       : [ SakuNota - Solusi Kasir UMKM ]
echo   • Struk Demo Sandbox    : Terdapat Tanda Anti-Fraud Tegas
echo   • Format Kertas         : Thermal 58mm ^& 80mm
echo.
echo Membuka Pengaturan Printer di Browser...
start https://angkringan-orang-kaya.ranutarde.workers.dev/admin/pengaturan/printer
pause
goto MENU

:JALANKAN_BAMBANG
cls
echo ======================================================================
echo    📶  DIVISI OFFLINE-FIRST & STORAGE - PETUGAS: BAMBANG
echo ======================================================================
echo.
echo   • Halaman Siap Offline  : /pos, /admin/*, /panduan
echo   • Penyimpanan Lokal     : IndexedDB (Dexie.js) - 100%% Aman di HP
echo   • Total File Cache PWA  : 110 File (3.98 MB di offline-manifest.json)
echo   • Backup & Restore      : Admin -^> Pengaturan -^> Data Toko (JSON)
echo.
echo Membuka Diagnostik Data Toko di Browser...
start https://angkringan-orang-kaya.ranutarde.workers.dev/admin/pengaturan/data
pause
goto MENU

:JALANKAN_STATUS
cls
call status-kantor.bat
goto MENU

:KELUAR
exit
