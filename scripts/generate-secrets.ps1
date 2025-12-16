# Generate secrets for deployment (PowerShell version)
# Run this to generate secure random secrets

Write-Host "🔐 Generating Secrets for AgentHub Deployment" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Generate NEXTAUTH_SECRET
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$nextAuthSecret = [Convert]::ToBase64String($bytes)
Write-Host "NEXTAUTH_SECRET:" -ForegroundColor Yellow
Write-Host $nextAuthSecret
Write-Host ""

# Generate AGENT_RUNTIME_SECRET (use same value in both services)
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$agentRuntimeSecret = [Convert]::ToBase64String($bytes)
Write-Host 'AGENT_RUNTIME_SECRET (same value in both services):' -ForegroundColor Yellow
Write-Host $agentRuntimeSecret
Write-Host ""

# Generate AGENT_SERVICE_KEY (use same value in both services)
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$agentServiceKey = [Convert]::ToBase64String($bytes)
Write-Host 'AGENT_SERVICE_KEY (same value in both services):' -ForegroundColor Yellow
Write-Host $agentServiceKey
Write-Host ""

Write-Host "✅ Secrets generated!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Copy these values to:" -ForegroundColor Cyan
Write-Host "   - Render Dashboard → Your Services → Environment Variables" -ForegroundColor White
Write-Host ""

