# GPTrue - Chatbot Generativo para Análise de Dados de E-commerce 🤖📊

<div align="center">

![GPTrue Logo](assets/logo.png)

[![NestJS](https://img.shields.io/badge/NestJS-10.0+-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-20.0+-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

## 📝 Índice

- [Sobre](#sobre)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Começando](#começando)
  - [Pré-requisitos](#pré-requisitos)
  - [Instalação](#instalação)
  - [Configuração](#configuração)
- [Uso](#uso)
- [API](#api)
- [Testes](#testes)
- [Deploy](#deploy)
- [FAQ](#faq)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## 🎯 Sobre

O GPTrue é um chatbot generativo integrado ao "Painel True", desenvolvido para fornecer insights e análises sobre dados de e-commerce armazenados no BigQuery. O sistema permite que usuários façam perguntas em linguagem natural sobre pedidos, produtos, vendas, assinantes, e outras métricas de negócio, e recebam respostas contextualizadas baseadas nos dados reais da plataforma.

### ✨ Características

- 🤖 Interface conversacional em linguagem natural
- 📊 Análise avançada de dados de e-commerce
- 🔍 Busca semântica com cache inteligente
- 📈 Geração dinâmica de consultas SQL
- 🔄 Aprendizado contínuo através de feedback
- 📱 API RESTful para integração flexível
- 🔐 Autenticação segura com Clerk
- 📦 Cache distribuído com Upstash Redis

## 🛠 Tecnologias

### Core
- [NestJS](https://nestjs.com/) - Framework backend
- [TypeScript](https://www.typescriptlang.org/) - Linguagem de programação
- [Node.js](https://nodejs.org/) - Runtime JavaScript
- [Docker](https://www.docker.com/) - Containerização

### IA & Dados
- [Google BigQuery](https://cloud.google.com/bigquery) - Data Warehouse
- [Vertex AI](https://cloud.google.com/vertex-ai) - Geração de SQL
- [OpenAI](https://openai.com/) - Processamento de linguagem natural
- [Pinecone](https://www.pinecone.io/) - Vector Store
- [LangChain](https://js.langchain.com/) - Framework de IA

### Infraestrutura
- [Upstash Redis](https://upstash.com/) - Cache distribuído
- [Clerk](https://clerk.com/) - Autenticação
- [GitHub Actions](https://github.com/features/actions) - CI/CD

## 🏗 Arquitetura

\`\`\`mermaid
graph TD
    A[Frontend] -->|REST API| B[API Gateway]
    B --> C[Orchestrator]
    C --> D[Query Generator]
    C --> E[Semantic Cache]
    C --> F[Response Generator]
    D --> G[BigQuery]
    E --> H[Pinecone]
    F --> I[OpenAI/Vertex AI]
\`\`\`

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Conta Google Cloud com BigQuery habilitado
- Contas nos serviços:
  - Clerk
  - Pinecone
  - OpenAI
  - Upstash Redis

### Instalação

1. Clone o repositório
\`\`\`bash
git clone https://github.com/seu-usuario/gptrue.git
cd gptrue
\`\`\`

2. Instale as dependências
\`\`\`bash
npm install
\`\`\`

3. Configure as variáveis de ambiente
\`\`\`bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
\`\`\`

4. Inicie o projeto
\`\`\`bash
# Desenvolvimento
npm run start:dev

# Produção com Docker
docker-compose up -d
\`\`\`

### 🔧 Configuração

#### Variáveis de Ambiente Necessárias:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| \`PORT\` | Porta da aplicação | 3000 |
| \`NODE_ENV\` | Ambiente | development |
| \`CLERK_SECRET_KEY\` | Chave secreta do Clerk | sk_test_... |
| \`GOOGLE_CLOUD_PROJECT_ID\` | ID do projeto GCP | my-project |
| \`PINECONE_API_KEY\` | Chave API do Pinecone | abc123... |
| \`OPENAI_API_KEY\` | Chave API da OpenAI | sk-... |

[Ver todas as variáveis de ambiente](#)

## 📖 Uso

### Exemplos de Perguntas

1. **Análise de Vendas**
\`\`\`
"Quais foram os 5 produtos mais vendidos no último mês?"
\`\`\`

2. **Métricas de Assinatura**
\`\`\`
"Qual a taxa de renovação das assinaturas nos últimos 3 meses?"
\`\`\`

### Endpoints da API

\`\`\`typescript
POST /conversation
GET /conversation/history
POST /conversation/feedback
\`\`\`

[Ver documentação completa da API](#)

## 🧪 Testes

\`\`\`bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura
npm run test:cov
\`\`\`

## 📦 Deploy

1. Build da aplicação
\`\`\`bash
npm run build
\`\`\`

2. Deploy com Docker
\`\`\`bash
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## ❓ FAQ

<details>
<summary>Como funciona o cache semântico?</summary>
O sistema utiliza o Pinecone para armazenar embeddings de perguntas anteriores...
</details>

<details>
<summary>Como são geradas as consultas SQL?</summary>
O Vertex AI é utilizado para traduzir perguntas em linguagem natural...
</details>

## 👥 Contribuindo

1. Fork o projeto
2. Crie sua Feature Branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit suas mudanças (\`git commit -m 'Add some AmazingFeature'\`)
4. Push para a Branch (\`git push origin feature/AmazingFeature\`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👏 Agradecimentos

- [True Source](https://truesource.com.br) - Pelo suporte e dados
- [Comunidade NestJS](https://nestjs.com/) - Pelo excelente framework
- [Contribuidores](#) - Por todas as contribuições

---

<div align="center">

Feito com ❤️ por [True Source](https://truesource.com.br)

</div>
