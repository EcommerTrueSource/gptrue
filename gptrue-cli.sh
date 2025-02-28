#!/bin/bash

# Script para executar a CLI do GPTrue

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o diretório cli existe
if [ ! -d "./cli" ]; then
    echo -e "${RED}Erro: Diretório 'cli' não encontrado.${NC}"
    exit 1
fi

# Mudar para o diretório cli
cd ./cli

# Verificar se o diretório node_modules existe
if [ ! -d "./node_modules" ]; then
    echo -e "${YELLOW}Dependências não encontradas. Executando instalação...${NC}"

    # Instalar dependências
    echo -e "${YELLOW}Instalando dependências...${NC}"
    npm install

    # Compilar o código TypeScript
    echo -e "${YELLOW}Compilando código TypeScript...${NC}"
    npm run build
else
    # Verificar se o diretório dist existe
    if [ ! -d "./dist" ]; then
        echo -e "${YELLOW}Compilando código TypeScript...${NC}"
        npm run build
    fi

    # Executar a CLI
    echo -e "${GREEN}Iniciando GPTrue CLI...${NC}"
    npm start
fi

# Voltar para o diretório original
cd ..
