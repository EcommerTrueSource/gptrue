# Script para executar a CLI do GPTrue

# Verificar se o diretório cli existe
if (-not (Test-Path -Path ".\cli")) {
    Write-Host "Erro: Diretório 'cli' não encontrado." -ForegroundColor Red
    exit 1
}

# Mudar para o diretório cli
Set-Location -Path ".\cli"

# Verificar se o diretório node_modules existe
if (-not (Test-Path -Path ".\node_modules")) {
    Write-Host "Dependências não encontradas. Executando instalação..." -ForegroundColor Yellow

    # Executar o script de instalação
    .\setup.ps1
}
else {
    # Verificar se o diretório dist existe
    if (-not (Test-Path -Path ".\dist")) {
        Write-Host "Compilando código TypeScript..." -ForegroundColor Yellow
        npm run build
    }

    # Executar a CLI
    Write-Host "Iniciando GPTrue CLI..." -ForegroundColor Green
    npm start
}

# Voltar para o diretório original
Set-Location -Path ".."
