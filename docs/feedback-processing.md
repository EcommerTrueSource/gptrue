# Processamento de Feedback no GPTrue

Este documento descreve o sistema de processamento de feedback implementado no GPTrue, incluindo a coleta, armazenamento, análise e aplicação do feedback para melhorar continuamente as respostas do chatbot.

## Visão Geral

O GPTrue implementa um sistema completo de feedback que permite:

1. Coletar feedback explícito e implícito dos usuários
2. Armazenar esse feedback no Pinecone junto com os templates
3. Analisar periodicamente os feedbacks para identificar padrões
4. Melhorar os templates com base nos insights obtidos

## Coleta de Feedback

### Feedback Explícito

O usuário pode fornecer feedback explícito através de:

- **Botões de Avaliação**: Opções "👍 Útil" e "👎 Não útil" após cada resposta
- **Comentários Textuais**: Campo para adicionar comentários detalhados sobre a resposta

### Feedback Implícito

O sistema também interpreta o texto do usuário no chat como feedback implícito:

- Mensagens como "isso está errado" ou "não era isso que eu queria" são interpretadas como feedback negativo
- Mensagens como "perfeito, obrigado" ou "excelente resposta" são interpretadas como feedback positivo

### Categorização Automática

O sistema categoriza automaticamente o feedback com base no conteúdo dos comentários:

```typescript
// Análise simples para extrair categorias do comentário
const possibleCategories = ['sql', 'dados', 'formatação', 'performance', 'precisão', 'clareza'];
const commentLower = feedback.comment.toLowerCase();

const detectedCategories = possibleCategories.filter(category =>
  commentLower.includes(category)
);
```

## Armazenamento de Feedback

Todo feedback é armazenado no Pinecone como parte dos metadados dos templates:

```typescript
export interface PineconeMetadata {
  // Outros campos...
  feedbackPositive: number;
  feedbackNegative: number;
  feedbackComments: string[];
  feedbackCategories?: string[];
  lastFeedbackDate?: string;
  needsReview: boolean;
  // ...
}
```

Quando um feedback é recebido, o sistema atualiza os metadados no Pinecone:

```typescript
const updatedMetadata: Partial<PineconeMetadata> = {
  feedbackPositive,
  feedbackNegative,
  feedbackComments,
  feedbackCategories,
  // ...
};
```

## Análise de Feedback

### Análise Periódica

O sistema realiza análise periódica de feedback através de uma tarefa agendada:

```typescript
@Cron('0 2 1 * *') // Primeiro dia do mês às 2h da manhã
async scheduledFeedbackAnalysis() {
  this.logger.log('[FEEDBACK_LEARNING] Iniciando análise agendada mensal de feedback');
  
  try {
    // Analisar feedback
    const analytics = await this.analyzeFeedback();
    
    // Identificar padrões
    const patterns = await this.identifyFeedbackPatterns();
    
    // Identificar templates para revisão
    const templatesForReview = await this.identifyTemplatesForReview();
    
    // Gerar relatório
    const report = await this.generateLearningReport();
    
    // Registrar estatísticas básicas
    this.logger.log(`[FEEDBACK_LEARNING] Análise mensal concluída: ${analytics.totalFeedback} feedbacks processados`);
    // ...
  } catch (error) {
    this.logger.error(`[FEEDBACK_LEARNING] Erro na análise agendada: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

A frequência de análise é configurada para:
- **Baixo volume (<100 interações/dia)**: Análise mensal (configuração atual)
- **Volume médio (100-1000 interações/dia)**: Análise semanal (recomendado para escala futura)
- **Alto volume (>1000 interações/dia)**: Análise diária (recomendado para grande escala)

### Análise Sob Demanda

Além da análise periódica, o sistema oferece endpoints REST para análise sob demanda:

```typescript
@Controller('api/feedback-learning')
export class FeedbackLearningController {
  @Get('analytics')
  async getFeedbackAnalytics(): Promise<FeedbackAnalytics> {
    return this.feedbackLearningService.analyzeFeedback();
  }
  
  @Get('patterns')
  async getFeedbackPatterns(): Promise<FeedbackPattern[]> {
    return this.feedbackLearningService.identifyFeedbackPatterns();
  }
  
  @Get('templates-for-review')
  async getTemplatesForReview(@Query('threshold') threshold?: number): Promise<Template[]> {
    return this.feedbackLearningService.identifyTemplatesForReview(threshold ? Number(threshold) : undefined);
  }
  
  @Get('report')
  async getLearningReport(): Promise<string> {
    return this.feedbackLearningService.generateLearningReport();
  }
}
```

## Processamento e Aprendizado

### Identificação de Padrões

O sistema identifica padrões de feedback negativo:

```typescript
async identifyFeedbackPatterns(): Promise<FeedbackPattern[]> {
  // Analisar categorias com maior taxa de feedback negativo
  for (const [category, data] of Object.entries(analytics.feedbackByCategory)) {
    if (data.total < 5) continue; // Ignorar categorias com poucos feedbacks
    
    const negativePercentage = (data.negative / data.total) * 100;
    
    // Considerar apenas categorias com mais de 20% de feedback negativo
    if (negativePercentage > 20) {
      patterns.push({
        category,
        count: data.negative,
        percentage: negativePercentage
      });
    }
  }
  // ...
}
```

### Identificação de Templates Problemáticos

O sistema identifica templates que precisam de revisão:

```typescript
async identifyTemplatesForReview(threshold: number = 30): Promise<Template[]> {
  // Considerar apenas templates com pelo menos 3 feedbacks
  if (totalFeedback >= 3) {
    const negativePercentage = (template.feedback.negative / totalFeedback) * 100;
    
    if (negativePercentage >= threshold || template.feedback.needsReview) {
      templatesForReview.push(template);
    }
  }
  // ...
}
```

### Geração de Relatórios

O sistema gera relatórios detalhados com insights sobre o feedback:

```typescript
async generateLearningReport(): Promise<string> {
  // Construir relatório
  let report = `# Relatório de Aprendizado de Feedback\n\n`;
  report += `## Estatísticas Gerais\n`;
  report += `- Total de feedbacks: ${analytics.totalFeedback}\n`;
  report += `- Feedbacks positivos: ${analytics.positiveFeedback} (${positiveFeedbackRate.toFixed(2)}%)\n`;
  report += `- Feedbacks negativos: ${analytics.negativeFeedback} (${(100 - positiveFeedbackRate).toFixed(2)}%)\n\n`;
  
  // Padrões identificados
  // Templates para revisão
  // ...
}
```

## Aplicação do Aprendizado

O aprendizado é aplicado de duas formas:

### 1. Melhoria Automática

Os templates com feedback positivo são priorizados nas respostas futuras. Quando uma pergunta similar é feita, o sistema prefere usar templates bem avaliados.

### 2. Revisão Manual Assistida

Templates com feedback negativo significativo são marcados para revisão. O sistema gera um relatório detalhado para que a equipe possa melhorar esses templates.

## Ciclo Completo de Aprendizado

1. **Coleta**: O feedback é coletado durante as interações e armazenado no Pinecone
2. **Análise**: O `FeedbackLearningService` analisa periodicamente os feedbacks
3. **Identificação**: Templates problemáticos são identificados
4. **Melhoria**: 
   - Templates bem avaliados são priorizados
   - Templates problemáticos são revisados e melhorados
5. **Aplicação**: Nas próximas interações, o sistema usa o conhecimento melhorado

Este ciclo contínuo garante que o GPTrue evolua constantemente, aprendendo com os erros e reforçando os acertos, resultando em respostas cada vez mais precisas e úteis para os usuários.

## Configuração

O sistema de feedback pode ser configurado através das seguintes variáveis de ambiente:

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `FEEDBACK_THRESHOLD` | Limite mínimo de feedback para análise | `5` |
| `MIN_TEMPLATES_FOR_ANALYSIS` | Número mínimo de templates para análise | `10` |
| `FEEDBACK_REPORT_STORAGE_ENABLED` | Habilitar armazenamento de relatórios | `false` |

## Endpoints de API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/feedback-learning/analytics` | GET | Obter análise de feedback |
| `/api/feedback-learning/patterns` | GET | Obter padrões de feedback |
| `/api/feedback-learning/templates-for-review` | GET | Obter templates que precisam de revisão |
| `/api/feedback-learning/report` | GET | Gerar relatório de aprendizado |

## Exemplo de Fluxo de Feedback

```
Usuário: Quais foram os 5 produtos mais vendidos no último mês?

GPTrue: [Gera uma tabela com os 5 produtos mais vendidos]
        Com base nos dados do BigQuery, os 5 produtos mais vendidos no último mês foram:
        1. Smartphone XYZ - 1.245 unidades
        2. Notebook ABC - 987 unidades
        3. Fone de Ouvido DEF - 876 unidades
        4. Smart TV GHI - 754 unidades
        5. Tablet JKL - 632 unidades
        
        👍 Útil | 👎 Não útil | 💬 Comentário

Usuário: Esses dados parecem incorretos. Na região Sul o valor está muito baixo.

GPTrue: Peço desculpas pela imprecisão. Vou verificar novamente os dados específicos para a região Sul.
        [Gera nova consulta com filtro por região]
```

Neste exemplo, o sistema detecta automaticamente um feedback negativo relacionado à precisão dos dados e registra isso para análise futura. 
