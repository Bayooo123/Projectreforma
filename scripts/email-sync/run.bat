@echo off
cd /d "%~dp0"

echo Installing what's needed (only takes a moment the first time)...
python3 -m pip install -r requirements.txt >nul 2>&1

echo.
echo ============================================================
echo  STEP 1: Preview only. Nothing gets sent to Reforma yet.
echo  You'll be asked for your email and password below.
echo ============================================================
echo.

python3 sync_emails.py --imap-host abiolasanniandco.com --range month --dry-run

echo.
echo ============================================================
echo  That was just a preview. Nothing was sent.
set /p CONFIRM="Type YES and press Enter to actually send these emails into Reforma: "

if /I "%CONFIRM%"=="YES" (
    echo.
    echo Sending for real now — you'll be asked for your email, password, and the Reforma API key.
    python3 sync_emails.py --imap-host abiolasanniandco.com --range month
) else (
    echo.
    echo Stopped. Nothing was sent. Just double-click this file again whenever you're ready.
)

echo.
pause
