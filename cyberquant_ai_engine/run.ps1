$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting CyberQuant AI Assistant (Team Firewall Force)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$py313 = "C:\Users\User\AppData\Local\Programs\Python\Python313\python.exe"

if (Test-Path $py313) {
    Write-Host "[OK] Using Python 3.13: $py313" -ForegroundColor Green
    & $py313 (Join-Path $ScriptDir "main.py")
} else {
    Write-Host "[INFO] Python 3.13 not found at default location, trying system python..." -ForegroundColor Yellow
    python (Join-Path $ScriptDir "main.py")
}
