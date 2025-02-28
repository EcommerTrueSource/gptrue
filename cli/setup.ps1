# Script de instalação e execução da CLI do GPTrue para Windows

Write-Host "=== Instalando GPTrue CLI ===" -ForegroundColor Green

# Verificar se o Node.js está instalado
try {
    $nodeVersion = node -v
    Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Erro: Node.js não encontrado. Por favor, instale o Node.js antes de continuar." -ForegroundColor Red
    exit 1
}

# Instalar dependências
Write-Host "Instalando dependências..." -ForegroundColor Yellow
npm install

# Compilar o código TypeScript
Write-Host "Compilando código TypeScript..." -ForegroundColor Yellow
npm run build

Write-Host "Instalação concluída com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Para executar a CLI, use um dos comandos:" -ForegroundColor Cyan
Write-Host "npm start" -ForegroundColor White
Write-Host "ou" -ForegroundColor Cyan
Write-Host "npm run dev (para desenvolvimento)" -ForegroundColor White
Write-Host ""

# Perguntar se deseja executar a CLI agora
$executar = Read-Host "Deseja executar a CLI agora? (S/N)"
if ($executar -eq "S" -or $executar -eq "s") {
    Write-Host "Iniciando GPTrue CLI..." -ForegroundColor Green
    npm start
} else {
    Write-Host "Você pode executar a CLI mais tarde usando 'npm start' no diretório da CLI." -ForegroundColor Yellow
}
