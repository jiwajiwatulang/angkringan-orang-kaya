@echo off
chcp 65001 >nul
cls
echo ======================================================
echo    PT SAKUNOTA SEJAHTERA - DIVISI QUALITY ASSURANCE
echo    Petugas: Paijo (Tukang Uji Brutal)
echo ======================================================
echo.
echo [1/2] Menjalankan 198 Unit Test Internal...
call npm test
if %errorlevel% neq 0 (
    echo.
    echo [LAPORAN PAIJO KE CEO] Unit Test ada yang gagal! Harap cek log di atas.
    pause
    exit /b %errorlevel%
)
echo.
echo [PAIJO] Seluruh 198 Unit Test LULUS SEMPURNA!
echo.
echo [2/2] Menjalankan Audit Otomatis Browser dan Offline (Playwright)...
node "C:\Users\REZA RESTU RENGGA\Documents\cek-sakunota.mjs"
if %errorlevel% neq 0 (
    echo.
    echo [LAPORAN PAIJO KE CEO] Audit browser menemukan kendala. Buka laporan di folder audit-output.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo  LAPORAN RESMI PAIJO UNTUK PAK CEO:
echo  Status: SEMUA JALUR AMAN DAN SIAP LAUNCHING (0 GAGAL)!
echo ======================================================
echo.
pause
