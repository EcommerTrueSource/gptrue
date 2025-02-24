# Documentação Técnica - GPTrue Backend

## 1. Visão Geral

O GPTrue é um chatbot generativo integrado ao "Painel True", projetado para fornecer insights e análises sobre dados de e-commerce armazenados no BigQuery. O sistema utiliza técnicas avançadas de processamento de linguagem natural e busca vetorial para responder perguntas dos usuários em linguagem natural, transformando-as em consultas SQL quando necessário.

## 2. Stack Tecnológica

### 2.1 Tecnologias Core

| Tecnologia               | Versão | Propósito                                          |
|--------------------------|--------|---------------------------------------------------|
| NestJS                   | 10.x   | Framework backend principal                        |
| TypeScript               | 5.x    | Linguagem de programação com tipagem estática      |
| Node.js                  | 18.x   | Ambiente de execução                               |
| LangChain                | 0.x    | Orquestração de modelos de linguagem               |
| Pinecone                 | API    | Armazenamento vetorial para caching semântico      |
| Google BigQuery          | API    | Armazenamento e consulta de dados do e-commerce    |
| Google Vertex AI         | API    | Geração de consultas SQL a partir de linguagem natural |
| OpenAI API               | gpt-4  | Conversão de resultados para linguagem natural     |
| Docker                   | 20.x   | Containerização da aplicação                       |
| Kubernetes               | 1.25+  | Orquestração de contêineres (para produção)        |

### 2.2 Bibliotecas e Dependências

| Biblioteca               | Propósito                                                 |
|--------------------------|-----------------------------------------------------------|
| @nestjs/config           | Gerenciamento de configuração                             |
| @google-cloud/bigquery   | Cliente oficial para BigQuery                             |
| @pinecone-database/pinecone | Cliente oficial para Pinecone                          |
| langchain                | Framework para criação de aplicações com LLMs             |
| openai                   | SDK oficial da OpenAI                                     |
| axios                    | Cliente HTTP para requisições externas                    |
| class-validator          | Validação de entrada de dados                             |
| winston                  | Logging estruturado                                       |
| joi                      | Validação de esquema                                      |
| bullmq                   | Gerenciamento de filas e jobs (processamento assíncrono)  |

## 3. Arquitetura

### 3.1 Diagrama de Arquitetura

```
┌─────────────────┐         ┌─────────────────────────────────────────────────────────────────┐
│                 │         │                        GPTrue Backend                            │
│  Painel True    │         │  ┌──────────────┐  ┌───────────┐  ┌────────────────────────┐    │
│  (Frontend      │         │  │              │  │           │  │                        │    │
│   NextJS)       │◄────────┼─►│ API Gateway  │◄─┤ Orchestrator│◄┤ Query Generator Service │    │
│                 │   REST   │  │              │  │ Service   │  │                        │    │
└─────────────────┘   API    │  └──────┬───────┘  └─────┬─────┘  └────────────┬───────────┘    │
                             │         │                │                      │                │
                             │         │                │                      │                │
                             │  ┌──────▼───────┐  ┌─────▼────────┐  ┌─────────▼─────────┐      │
                             │  │              │  │              │  │                   │      │
                             │  │ Response     │  │ Semantic     │  │ Query Validator   │      │
                             │  │ Generator    │  │ Cache        │  │ Service           │      │
                             │  │ Service      │  │ Service      │  │                   │      │
                             │  └──────┬───────┘  └─────┬────────┘  └─────────┬─────────┘      │
                             │         │                │                      │                │
                             │         │                │                      │                │
                             │         │          ┌─────▼────────┐             │                │
                             │         │          │              │             │                │
                             │         └──────────┤ Feedback     │◄────────────┘                │
                             │                    │ Service      │                              │
                             │                    │              │                              │
                             │                    └──────────────┘                              │
                             └─────────────────────────────────────────────────────────────────┘
                                       │                │                     │
                                       │                │                     │
                             ┌─────────▼─────┐   ┌──────▼───────┐    ┌────────▼────────┐
                             │               │   │              │    │                 │
                             │ Google BigQuery   │ Pinecone     │    │ OpenAI/Vertex AI│
                             │               │   │              │    │                 │
                             └───────────────┘   └──────────────┘    └─────────────────┘
```

### 3.2 Componentes Principais

#### 3.2.1 API Gateway
- Ponto de entrada para todas as requisições
- Autenticação e autorização
- Roteamento de requisições para serviços apropriados
- Rate limiting e proteção contra abuso

#### 3.2.2 Orchestrator Service
- Coordena o fluxo de processamento completo
- Determina se a pergunta pode ser respondida do cache ou precisa de consulta
- Gerencia o estado da conversa
- Implementa o fluxo principal da aplicação

#### 3.2.3 Semantic Cache Service
- Interface com o Pinecone
- Armazena e recupera queries/respostas anteriores
- Implementa algoritmos de similaridade semântica
- Gerencia o ciclo de vida do cache (TTL, invalidação)

#### 3.2.4 Query Generator Service
- Traduz perguntas em linguagem natural para consultas SQL
- Utiliza Vertex AI para geração de SQL
- Mantém contexto das tabelas disponíveis
- Implementa restrições e parâmetros de segurança

#### 3.2.5 Query Validator Service
- Analisa e valida consultas SQL geradas
- Verifica segurança e performance
- Aplica otimizações quando possível
- Estima custo de execução da query

#### 3.2.6 Response Generator Service
- Traduz resultados técnicos para linguagem natural
- Formata respostas para diferentes tipos de dados (tabular, agregado, etc.)
- Adiciona contexto e explicações aos resultados
- Utiliza OpenAI para geração de texto natural

#### 3.2.7 Feedback Service
- Coleta e processa feedback dos usuários
- Atualiza templates no Pinecone
- Identifica padrões em feedbacks negativos
- Fornece métricas de qualidade para o sistema

## 4. Fluxo de Processamento Detalhado

### 4.1 Fluxo Principal

1. **Recebimento da Pergunta**
   - O frontend envia a pergunta do usuário via API
   - A requisição é autenticada e validada pelo API Gateway
   - A pergunta é normalizada e pré-processada

2. **Verificação no Cache Semântico**
   - A pergunta é convertida em um embedding vetorial
   - O Semantic Cache Service busca no Pinecone por perguntas similares
   - Se encontrado com similaridade > 0.85, retorna a resposta em cache

3. **Geração de SQL (se necessário)**
   - Se não encontrado no cache, o Query Generator Service é acionado
   - O contexto das tabelas e schema é fornecido ao Vertex AI
   - Uma consulta SQL é gerada baseada na pergunta

4. **Validação e Execução da Query**
   - O Query Validator Service analisa a consulta gerada
   - Se válida, a consulta é executada no BigQuery
   - Restrições de timeout e recursos são aplicadas

5. **Transformação do Resultado**
   - Os resultados brutos do BigQuery são processados
   - O Response Generator Service converte para linguagem natural
   - Formata e estrutura a resposta para exibição

6. **Armazenamento no Cache**
   - Um novo template é criado com pergunta, query, resultado e resposta
   - O template é armazenado no Pinecone para uso futuro
   - Metadados como timestamp e fonte são adicionados

7. **Retorno ao Usuário**
   - A resposta final é enviada ao frontend
   - Opções de feedback são incluídas
   - Métricas de performance são registradas

### 4.2 Fluxo de Feedback

1. O usuário fornece feedback positivo ou negativo sobre a resposta
2. O feedback é enviado ao Feedback Service
3. O template correspondente no Pinecone é atualizado com o feedback
4. Para feedback negativo, flags são adicionadas para revisão
5. Métricas agregadas são atualizadas

## 5. Modelo de Dados

### 5.1 Template de Cache

```typescript
interface CacheTemplate {
  id: string;                    // ID único do template
  question: string;              // Pergunta original do usuário
  questionEmbedding: number[];   // Vetor de embedding da pergunta
  query?: string;                // Consulta SQL gerada (se aplicável)
  queryResult?: any;             // Resultado bruto da consulta
  response: string;              // Resposta formatada em linguagem natural
  metadata: {
    createdAt: Date;             // Data de criação
    updatedAt: Date;             // Data da última atualização
    version: string;             // Versão do modelo/sistema
    executionTimeMs: number;     // Tempo de execução
    queryComplexity?: number;    // Estimativa de complexidade da query
    sourceTables: string[];      // Tabelas utilizadas na consulta
  };
  feedback: {
    positive: number;            // Contagem de feedback positivo
    negative: number;            // Contagem de feedback negativo
    comments: string[];          // Comentários de feedback (opcional)
    needsReview: boolean;        // Flag para revisão manual
  };
  ttl?: Date;                    // Time to live (opcional)
}
```

### 5.2 Configuração de Tabelas

```typescript
interface TableSchema {
  name: string;                  // Nome da tabela
  description: string;           // Descrição da funcionalidade
  fields: {
    name: string;                // Nome do campo
    type: string;                // Tipo de dado
    description: string;         // Descrição do campo
    examples: string[];          // Exemplos de valores
  }[];
  relationships: {               // Relacionamentos com outras tabelas
    table: string;
    field: string;
    foreignField: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  }[];
  commonQueries?: {              // Exemplos de queries comuns
    description: string;
    query: string;
  }[];
}
```

## 6. Segurança e Compliance

### 6.1 Segurança de Acesso

- Autenticação JWT para todos os endpoints
- Níveis de autorização por tipo de consulta
- Controle granular de acesso aos dados sensíveis
- Logs de auditoria para todas as operações

### 6.2 Segurança de Dados

- Sanitização de entradas para prevenir injeção SQL
- Mascaramento de dados sensíveis nos logs e respostas
- Criptografia em trânsito (TLS) e em repouso
- Políticas de retenção de dados claras

### 6.3 Limitações das Consultas

- Timeout máximo para execução de queries
- Limite de consumo de recursos do BigQuery
- Restrições em tipos de operações (DELETE, UPDATE, etc.)
- Limites de volume de dados retornados

## 7. Monitoramento e Observabilidade

### 7.1 Métricas Principais

- Tempo de resposta (completo e por etapa)
- Taxa de acerto do cache semântico
- Taxa de sucesso na geração de SQL
- Satisfação do usuário (baseada em feedback)
- Consumo de recursos (BigQuery, Vertex AI, OpenAI)

### 7.2 Logs Estruturados

```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;               // Componente que gerou o log
  traceId: string;               // ID de rastreamento da requisição
  userId?: string;               // ID do usuário (se autenticado)
  message: string;               // Mensagem principal
  context?: any;                 // Contexto adicional
  error?: {                      // Detalhes do erro (se aplicável)
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {                // Métricas de performance
    durationMs: number;
    cpuTimeMs?: number;
    memoryUsageMb?: number;
  };
}
```

### 7.3 Alertas

- Notificações para falhas recorrentes
- Alertas para aumento significativo no custo das consultas
- Monitoramento de taxa de feedback negativo
- Detecção de anomalias no padrão de uso

## 8. Escalabilidade e Performance

### 8.1 Estratégias de Escalabilidade

- Arquitetura de microserviços para escala horizontal
- Auto-scaling baseado em métricas de carga
- Separação de workloads de leitura e escrita
- Processamento assíncrono para operações demoradas

### 8.2 Otimizações de Performance

- Caching em múltiplas camadas
- Pooling de conexões para BigQuery
- Paralelização de processos independentes
- Pré-computação de consultas frequentes

### 8.3 Limites e Capacidade

- Capacidade inicial: 10 requisições/segundo
- Latência alvo: < 3 segundos para 95% das requisições
- Disponibilidade alvo: 99.9%
- Recuperação de desastres: RTO < 1 hora, RPO < 5 minutos

## 9. Guia de Implementação

### 9.1 Fases de Desenvolvimento

#### Fase 1: MVP Básico
- Implementar fluxo principal com consultas simples
- Integração básica com Pinecone e BigQuery
- Suporte para consultas sobre produtos apenas
- Testes com conjunto limitado de perguntas

#### Fase 2: Expansão de Capacidades
- Adicionar suporte para todos os tipos de tabelas
- Implementar sistema de feedback completo
- Melhorar algoritmos de cache semântico
- Expandir validação e otimização de queries

#### Fase 3: Otimização e Escala
- Implementar cache em camadas
- Adicionar processamento assíncrono
- Melhorar segurança e observabilidade
- Implementar estratégias avançadas de escalabilidade

### 9.2 Estrutura de Diretórios

```
src/
├── main.ts                      # Ponto de entrada da aplicação
├── app.module.ts                # Módulo principal
├── config/                      # Configurações da aplicação
├── common/                      # Código compartilhado
│   ├── decorators/              # Decoradores personalizados
│   ├── filters/                 # Filtros de exceção
│   ├── guards/                  # Guards de autenticação
│   ├── interceptors/            # Interceptors
│   ├── pipes/                   # Pipes de validação
│   └── utils/                   # Utilidades gerais
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

### 9.3 Princípios de Design

- **SOLID**: Seguir princípios SOLID para código sustentável
- **Desacoplamento**: Minimizar dependências entre serviços
- **Testabilidade**: Desenhar para facilitar testes automatizados
- **Falha Graciosa**: Implementar fallbacks para todos os pontos de falha
- **Configuração Externalizada**: Usar configuração injetada via ambiente

## 10. Considerações e Limitações

### 10.1 Considerações de Custo

- Estimativas de custo mensal baseadas em volume esperado
- Estratégias para otimizar custos de APIs externas
- Monitoramento de gastos com alertas para anomalias
- ROI esperado em comparação com soluções alternativas

### 10.2 Limitações Conhecidas

- Complexidade máxima de consultas suportadas
- Tipos de perguntas que o sistema pode ter dificuldade em responder
- Tempo de latência para consultas complexas que não podem ser cacheadas
- Dependência de qualidade das APIs externas (Vertex AI, OpenAI)

### 10.3 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Geração de SQL incorreto | Média | Alto | Validação rigorosa, feedback contínuo |
| Custos elevados de API | Média | Médio | Caching eficiente, monitoramento de custos |
| Tempo de resposta lento | Baixa | Alto | Otimização de queries, processamento assíncrono |
| Falha nas APIs externas | Baixa | Alto | Sistemas de fallback, redundância |
| Vazamento de dados sensíveis | Muito baixa | Muito alto | Validação, mascaramento, auditoria |

## 11. Integração com o Frontend

### 11.1 API Endpoints

#### Conversação
- `POST /api/conversation`: Enviar nova mensagem
- `GET /api/conversation/{id}`: Obter conversa por ID
- `PUT /api/conversation/{id}/feedback`: Enviar feedback

#### Administração
- `GET /api/admin/metrics`: Obter métricas do sistema
- `GET /api/admin/templates`: Listar templates armazenados
- `PUT /api/admin/templates/{id}`: Atualizar template

### 11.2 Formato de Requisição/Resposta

```typescript
// Requisição de nova mensagem
interface ConversationRequest {
  message: string;               // Pergunta do usuário
  conversationId?: string;       // ID da conversa (opcional)
  context?: {                    // Contexto adicional (opcional)
    filters?: Record<string, any>;
    timeRange?: {
      start: string;
      end: string;
    };
    preferredVisualization?: string;
  };
  options?: {
    maxResultRows?: number;      // Limite de linhas no resultado
    includeSql?: boolean;        // Incluir SQL na resposta
    timeout?: number;            // Timeout personalizado (ms)
  };
}

// Resposta
interface ConversationResponse {
  id: string;                    // ID da resposta
  conversationId: string;        // ID da conversa
  message: string;               // Resposta em linguagem natural
  metadata: {
    processingTimeMs: number;    // Tempo de processamento
    source: 'cache' | 'query';   // Fonte da resposta
    confidence: number;          // Confiança na resposta (0-1)
    tables?: string[];           // Tabelas utilizadas
    sql?: string;                // SQL gerado (se solicitado)
  };
  data?: {                       // Dados estruturados (se aplicável)
    type: 'table' | 'scalar' | 'chart';
    content: any;
  };
  suggestions?: string[];        // Sugestões de perguntas relacionadas
  feedbackOptions: {             // Opções de feedback
    thumbsUp: boolean;           // Botão de feedback positivo
    thumbsDown: boolean;         // Botão de feedback negativo
    commentEnabled: boolean;     // Campo de comentário habilitado
  };
}
```

### 11.3 Eventos em Tempo Real

- Implementação de WebSockets para atualizações em tempo real
- Notificações sobre progresso de consultas longas
- Streaming de respostas para consultas complexas

## 12. Conclusão

O GPTrue é uma solução de chatbot generativo especializado em dados de e-commerce, projetado para fornecer respostas baseadas em dados através de linguagem natural. A arquitetura proposta combina o melhor das tecnologias modernas de IA e engenharia de dados para criar uma experiência de usuário fluida e informativa, com ênfase em performance, segurança e escalabilidade.

A implementação em fases progressivas permitirá validar premissas e ajustar o sistema com base em feedback real, garantindo que o produto final atenda às necessidades dos usuários de forma eficiente e eficaz.

---

## Apêndice A: Exemplos de Fluxos

### Exemplo 1: Consulta sobre Produtos Mais Vendidos

```
Usuário: "Quais foram os 5 produtos mais vendidos no último mês?"

1. A pergunta é recebida pelo API Gateway e encaminhada ao Orchestrator.
2. O Semantic Cache Service não encontra correspondência no Pinecone.
3. O Query Generator Service cria a seguinte consulta SQL:

   SELECT 
     p.NameComplete as nome_produto,
     SUM(i.quantidade) as total_vendido
   FROM PEDIDOS as o
   JOIN JSON_TABLE(o.itensJSON, '$[*]' COLUMNS(
     codigo STRING PATH '$.codigo',
     quantidade INT PATH '$.quantidade'
   )) as i
   JOIN PRODUTOS as p ON i.codigo = p.ProductRefId
   WHERE o.data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
   GROUP BY p.NameComplete
   ORDER BY total_vendido DESC
   LIMIT 5;

4. O Query Validator Service valida e otimiza a consulta.
5. A query é executada no BigQuery, retornando os resultados.
6. O Response Generator Service formata a resposta:

   "Os 5 produtos mais vendidos no último mês foram:
    1. Nootrópico Brain Up - 60 tabletes - True Source (423 unidades)
    2. Multivitamínico Daily - 30 cápsulas - True Source (389 unidades)
    3. Proteína vegana - Chocolate - 900g - True Source (256 unidades)
    4. Colágeno hidrolisado - 300g - True Source (201 unidades)
    5. Omega 3 - 60 cápsulas - True Source (178 unidades)"

7. O template é armazenado no Pinecone para uso futuro.
8. A resposta é enviada ao usuário com opções de feedback.
```

### Exemplo 2: Análise de Assinaturas

```
Usuário: "Qual a taxa de renovação das assinaturas nos últimos 3 meses?"

[Fluxo semelhante, com query específica para assinaturas...]
```

## Apêndice B: Referências

- [Documentação NestJS](https://docs.nestjs.com/)
- [Google BigQuery API](https://cloud.google.com/bigquery/docs/reference/rest)
- [Pinecone API Reference](https://docs.pinecone.io/reference)
- [LangChain Documentation](https://js.langchain.com/docs/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)