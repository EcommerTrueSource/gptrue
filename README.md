# GPTrue - Chatbot Generativo para Análise de Dados de E-commerce

GPTrue é um chatbot generativo integrado ao "Painel True", desenvolvido para fornecer insights e análises sobre dados de e-commerce armazenados no BigQuery. O sistema permite que usuários façam perguntas em linguagem natural sobre pedidos, produtos, vendas, assinantes, e outras métricas de negócio, e recebam respostas contextualizadas baseadas nos dados reais da plataforma.

## Visão Geral

O sistema utiliza uma combinação de busca vetorial e geração dinâmica de consultas SQL para fornecer respostas precisas e eficientes, enquanto aprende continuamente através de feedback dos usuários.

### Principais Funcionalidades

- **Consultas em Linguagem Natural**: Permite que usuários façam perguntas sobre dados de e-commerce em linguagem natural
- **Geração Dinâmica de SQL**: Converte perguntas em consultas SQL otimizadas para o BigQuery
- **Cache Semântico**: Armazena consultas e respostas para reutilização futura
- **Feedback e Aprendizado**: Melhora continuamente com base no feedback dos usuários
- **Segurança e Performance**: Implementa validações rigorosas e otimizações para consultas SQL

## Tecnologias

- **Backend**: NestJS 10+ com TypeScript
- **Vector Store**: Pinecone para armazenamento e busca semântica
- **Banco de dados**: Google BigQuery para armazenamento e consulta dos dados de e-commerce
- **IA Generativa**: Google Vertex AI para geração de consultas SQL, OpenAI API (GPT-4) para geração de respostas em linguagem natural
- **Orquestração**: LangChain para fluxos de processamento de linguagem natural
- **Containerização**: Docker para desenvolvimento e produção
- **CI/CD**: GitHub Actions para integração e entrega contínua

## Arquitetura

O sistema segue uma arquitetura de microserviços modular, com componentes específicos responsáveis por diferentes etapas do fluxo de processamento:

1. **API Gateway**: Gerencia autenticação, autorização e roteamento
2. **Orchestrator Service**: Coordena o fluxo completo de processamento
3. **Semantic Cache Service**: Interface com o Pinecone Vector Database
4. **Query Generator Service**: Traduz perguntas em linguagem natural para SQL
5. **Query Validator Service**: Analisa e valida consultas SQL
6. **BigQuery Connector Service**: Executa consultas no BigQuery
7. **Response Generator Service**: Traduz resultados técnicos para linguagem natural
8. **Feedback Service**: Coleta e processa feedback dos usuários

## Fluxo de Processamento

1. **Recebimento da Pergunta**: O frontend envia a pergunta do usuário via API REST
2. **Verificação no Cache Semântico**: A pergunta é convertida em embedding e buscada no Pinecone
3. **Geração de SQL**: Se não houver cache, o Query Generator Service gera uma consulta SQL
4. **Validação e Execução**: A consulta é validada e executada no BigQuery
5. **Transformação do Resultado**: Os resultados são processados e formatados em linguagem natural
6. **Armazenamento no Cache**: A pergunta, consulta e resposta são armazenadas no cache
7. **Retorno ao Usuário**: A resposta final é enviada ao frontend
8. **Processamento de Feedback**: O feedback do usuário é coletado e armazenado

## Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Conta no Google Cloud Platform com BigQuery ativado
- Conta no Pinecone
- Conta na OpenAI ou acesso ao Vertex AI

### Configuração do Ambiente

1. Clone o repositório:
   ```bash
git clone https://github.com/seu-usuario/gptrue.git
cd gptrue
   ```

2. Instale as dependências:
   ```bash
npm install
   ```

3. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas credenciais
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
npm run start:dev
   ```

### Configuração do Docker

1. Construa a imagem:
   ```bash
   docker-compose build
   ```

2. Inicie os containers:
   ```bash
docker-compose up -d
   ```

## Uso

### API Endpoints

- `POST /api/conversation`: Envia uma pergunta e recebe uma resposta
- `POST /api/feedback`: Envia feedback sobre uma resposta
- `GET /api/metrics`: Obtém métricas de performance do sistema
- `GET /api/templates`: Lista templates armazenados no cache
- `PUT /api/templates/:id`: Atualiza um template específico
- `DELETE /api/templates/:id`: Remove um template específico
- `POST /api/cache/clear`: Limpa o cache com base em critérios específicos
- `GET /api/health`: Verifica a saúde do sistema

### Exemplo de Requisição

```json
POST /api/conversation
{
  "message": "Quais foram os 5 produtos mais vendidos no último mês?",
  "conversationId": "optional-conversation-id",
  "context": {
    "timeRange": {
      "start": "2023-01-01",
      "end": "2023-01-31"
    }
  }
}
```

### Exemplo de Resposta

```json
{
  "id": "response-id",
  "conversationId": "conversation-id",
  "message": "Os 5 produtos mais vendidos no último mês foram:\n1. Nootrópico Brain Up - 60 tabletes (423 unidades)\n2. Multivitamínico Daily - 30 cápsulas (389 unidades)\n3. Proteína vegana - Chocolate - 900g (256 unidades)\n4. Colágeno hidrolisado - 300g (201 unidades)\n5. Omega 3 - 60 cápsulas (178 unidades)",
  "metadata": {
    "processingTimeMs": 245,
    "source": "query",
    "confidence": 0.95,
    "tables": ["PEDIDOS", "PRODUTOS"],
    "sql": "SELECT p.NameComplete as nome_produto, SUM(i.quantidade) as total_vendido FROM PEDIDOS as o JOIN JSON_TABLE(o.itensJSON, '$[*]' COLUMNS(codigo STRING PATH '$.codigo', quantidade INT PATH '$.quantidade')) as i JOIN PRODUTOS as p ON i.codigo = p.ProductRefId WHERE o.data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH) GROUP BY p.NameComplete ORDER BY total_vendido DESC LIMIT 5;"
  },
  "data": {
    "type": "table",
    "content": [
      {"nome_produto": "Nootrópico Brain Up - 60 tabletes", "total_vendido": 423},
      {"nome_produto": "Multivitamínico Daily - 30 cápsulas", "total_vendido": 389},
      {"nome_produto": "Proteína vegana - Chocolate - 900g", "total_vendido": 256},
      {"nome_produto": "Colágeno hidrolisado - 300g", "total_vendido": 201},
      {"nome_produto": "Omega 3 - 60 cápsulas", "total_vendido": 178}
    ]
  },
  "suggestions": [
    "Como isso se compara com o mês anterior?",
    "Qual a margem de lucro desses produtos?",
    "Quais categorias tiveram melhor desempenho?"
  ],
  "feedbackOptions": {
    "thumbsUp": true,
    "thumbsDown": true,
    "commentEnabled": true
  }
}
```

## Desenvolvimento

### Estrutura de Diretórios

```
src/
├── main.ts                      # Ponto de entrada da aplicação
├── app.module.ts                # Módulo principal
├── config/                      # Configurações da aplicação
├── common/                      # Código compartilhado
├── modules/                     # Módulos da aplicação
│   ├── api-gateway/             # API Gateway
│   ├── orchestrator/            # Orchestrator Service
│   ├── semantic-cache/          # Semantic Cache Service
│   ├── query-generator/         # Query Generator Service
│   ├── query-validator/         # Query Validator Service
│   ├── response-generator/      # Response Generator Service
│   └── feedback/                # Feedback Service
├── database/                    # Configurações de banco de dados
│   ├── bigquery/                # Integração com BigQuery
│   └── pinecone/                # Integração com Pinecone
└── integrations/                # Integrações externas
    ├── vertex-ai/               # Integração com Vertex AI
    └── openai/                  # Integração com OpenAI
```

### Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença [MIT](LICENSE).

## Contato

Para mais informações, entre em contato com a equipe de desenvolvimento.
