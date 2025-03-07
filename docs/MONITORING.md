# Sistema de Monitoramento - GPTrue

## Visão Geral
O sistema de monitoramento do GPTrue é responsável por coletar, armazenar e disponibilizar métricas importantes sobre o funcionamento da aplicação. Ele utiliza o Prometheus como backend de métricas e oferece endpoints REST para consulta de informações de saúde e uso do sistema.

## Componentes Principais

### 1. PrometheusService
Serviço responsável pela coleta e exposição de métricas do Prometheus.

#### Métricas Coletadas:
- **resource_usage**: Uso de recursos por tipo e serviço
- **api_requests_total**: Total de requisições da API por endpoint e status
- **api_latency_seconds**: Latência das requisições da API
- **errors_total**: Total de erros por serviço e tipo
- **query_duration_seconds**: Duração das queries por tipo
- **memory_usage_bytes**: Uso de memória por tipo
- **active_connections**: Número de conexões ativas por serviço

### 2. ConfigMonitoringService
Serviço que monitora e gerencia a configuração e uso de recursos do sistema.

#### Funcionalidades:
- Monitoramento de uso de memória
- Geração de relatórios periódicos
- Rastreamento de uso de recursos
- Alertas de uso crítico

#### Recursos Monitorados:
- BigQuery (bytes processados, resultados, queries concorrentes)
- OpenAI (tokens, requisições por minuto)
- Vertex AI (tokens, requisições por minuto)
- Redis (itens, memória)
- Rate Limiting (pontos, duração)

### 3. MonitoringController
Controlador que expõe endpoints REST para acesso às métricas e informações de monitoramento.

#### Endpoints:

##### GET /monitoring/metrics
Retorna métricas do Prometheus em formato texto.
```http
GET /monitoring/metrics
Accept: text/plain
```

##### GET /monitoring/health
Verifica a saúde do serviço.
```http
GET /monitoring/health
```
Resposta:
```json
{
  "status": "healthy",
  "timestamp": "2025-02-27T13:45:30.123Z"
}
```

##### GET /monitoring/usage
Obtém relatório de uso atual do sistema.
```http
GET /monitoring/usage
```
Resposta:
```json
{
  "timestamp": "2025-02-27T13:45:30.123Z",
  "memory": {
    "heapTotal": "150.25 MB",
    "heapUsed": "120.75 MB",
    "rss": "180.50 MB",
    "external": "25.30 MB"
  },
  "uptime": 3600,
  "environment": "production"
}
```

## Configuração

### Variáveis de Ambiente
```env
# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PATH=/metrics
PROMETHEUS_PREFIX=gptrue_
PROMETHEUS_DEFAULT_METRICS=true
PROMETHEUS_COLLECT_INTERVAL=10000

# Métricas e Timeouts
ENABLE_METRICS=true
METRICS_PORT=9090
REQUEST_TIMEOUT=30000
QUERY_TIMEOUT=60000
MAX_CONCURRENT_QUERIES=10

# Limites de Recursos
BIGQUERY_MAX_BYTES_PROCESSED=1000000000
OPENAI_MAX_TOKENS=2000
VERTEX_AI_MAX_TOKENS=1024
REDIS_MAX_ITEMS=100
REDIS_MAX_MEMORY_MB=512
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

## Alertas e Notificações

O sistema gera alertas nas seguintes situações:

1. **Uso de Memória**
   - Alerta quando o uso do heap ultrapassa 80% do total
   - Log de warning com percentual de uso

2. **Uso de Recursos**
   - Alerta quando qualquer recurso ultrapassa 80% do limite configurado
   - Alerta crítico quando ultrapassa 95% do limite

3. **Erros**
   - Registro de todos os erros com stack trace
   - Métricas específicas por tipo de erro

## Integração com Prometheus

### Labels Padrão
Todas as métricas incluem os seguintes labels:
- `app`: "gptrue"
- `environment`: ambiente atual (development, production, etc.)

### Buckets de Histogramas
- **API**: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] segundos
- **Query**: [0.5, 1, 2.5, 5, 10, 25, 50, 100] segundos
- **Memory**: [50MB, 100MB, 250MB, 500MB]

## Boas Práticas

1. **Monitoramento de Memória**
   - Verificação a cada 30 segundos
   - Formatação legível de valores de memória
   - Alertas proativos para prevenção de problemas

2. **Geração de Relatórios**
   - Relatórios gerados a cada hora
   - Armazenamento de histórico para análise de tendências
   - Formato padronizado para fácil integração

3. **Tratamento de Erros**
   - Registro detalhado de erros com contexto
   - Métricas separadas por tipo de erro
   - Notificações para erros críticos

## Exemplos de Uso

### Monitoramento de Recursos
```typescript
// Registrar uso de recursos
configMonitoringService.trackResourceUsage('bigquery.bytes', 1000000, 'query');

// Monitorar uso do OpenAI
configMonitoringService.trackOpenAIUsage(500, 'gpt-4');

// Monitorar requisições da API
configMonitoringService.trackAPIRequest('/api/query', 'POST', 200, startTime);
```

### Consulta de Métricas
```typescript
// Obter todas as métricas
const metrics = await prometheusService.getMetrics();

// Registrar erro
prometheusService.recordError('query-service', 'timeout');

// Registrar uso de memória
prometheusService.recordMemoryUsage('heap', process.memoryUsage().heapUsed);
```

## Próximos Passos

1. **Dashboards**
   - Implementar dashboards no Grafana
   - Criar visualizações específicas por tipo de métrica
   - Adicionar alertas visuais

2. **Alertas Avançados**
   - Integração com sistemas de notificação (Slack, Email)
   - Configuração de thresholds dinâmicos
   - Análise preditiva de problemas

3. **Métricas Adicionais**
   - Latência de cache
   - Uso de CPU
   - Métricas de rede
   - Performance de queries específicas 
