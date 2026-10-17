@echo off
chcp 65001 >nul
cls
echo ======================================================
echo    PT SAKUNOTA SEJAHTERA - PAPAN STATUS KANTOR
echo    Pemilik: Pak CEO
echo ======================================================
echo.
echo [1] Status Git dan Commit Terakhir:
git log -1 --oneline
echo    Cabang: main
echo.
echo [2] Daftar Pasukan Siap Kerja:
echo    - Supardo  (Mandor UI Kasir)      : STANDBY
echo    - Mutino   (Satpam Keamanan API)  : STANDBY
echo    - Paijo    (Tukang Uji Playwright): STANDBY
echo    - Bejo     (Mekanik Struk BT)     : STANDBY
echo    - Slamet   (DevOps dan Deploy)    : STANDBY
echo    - Tejo     (Humas dan WhatsApp)   : STANDBY
echo.
echo [3] Jalur Pintas Perintah:
echo    - Ketik "paijo-cek.bat"    untuk suruh Paijo tes aplikasi
echo    - Ketik "slamet-deploy.bat" untuk suruh Slamet rilis ke Cloudflare
echo.
echo ======================================================
echo.
pause
