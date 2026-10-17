@echo off
chcp 65001 >nul
cls
echo ======================================================
echo    PT SAKUNOTA SEJAHTERA - DIVISI DEVOPS DAN RILIS
echo    Petugas: Slamet (Kuli Angkut dan Build)
echo ======================================================
echo.
echo [1/3] Menjalankan Build Produksi Next.js...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [LAPORAN SLAMET KE CEO] Build aplikasi gagal!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Memperbarui Offline Manifest Service Worker...
echo [SLAMET] Berkas offline-manifest.json dan sw.js siap disajikan.

echo.
echo [3/3] Mengunggah rilis ke Cloudflare Workers...
call npx wrangler deploy
if %errorlevel% neq 0 (
    echo.
    echo [LAPORAN SLAMET KE CEO] Gagal upload ke Cloudflare Workers!
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo  LAPORAN RESMI SLAMET UNTUK PAK CEO:
echo  Aplikasi Berhasil Tayang di Cloudflare Workers!
echo  URL Live: https://angkringan-orang-kaya.ranutarde.workers.dev
echo ======================================================
echo.
pause
