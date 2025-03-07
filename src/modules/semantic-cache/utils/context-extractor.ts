import { ConversationState, ConversationMessage } from '../../orchestrator/interfaces/conversation.interface';
import { ConversationContext } from '../interfaces/semantic-cache.interface';

/**
 * Extrai tópicos relevantes de um texto
 * Implementação simplificada baseada em palavras-chave
 */
export function extractTopics(text: string): string[] {
  if (!text) return [];

  // Lista de tópicos comuns no contexto de e-commerce/vendas
  const topicKeywords: Record<string, string[]> = {
    'vendas': ['venda', 'vendido', 'vendas', 'comercializado', 'comercialização', 'faturamento'],
    'produtos': ['produto', 'produtos', 'item', 'itens', 'mercadoria'],
    'clientes': ['cliente', 'clientes', 'consumidor', 'consumidores', 'comprador'],
    'pedidos': ['pedido', 'pedidos', 'compra', 'compras', 'aquisição'],
    'estoque': ['estoque', 'inventário', 'disponibilidade', 'armazenamento'],
    'preços': ['preço', 'preços', 'valor', 'valores', 'custo', 'custos'],
    'categorias': ['categoria', 'categorias', 'tipo', 'tipos', 'classificação'],
    'período': ['período', 'data', 'mês', 'ano', 'semana', 'trimestre', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    'desempenho': ['desempenho', 'performance', 'resultado', 'resultados', 'métrica', 'métricas'],
    'comparação': ['comparação', 'comparar', 'versus', 'contra', 'diferença', 'similar'],
  };

  const textLower = text.toLowerCase();
  const foundTopics: string[] = [];

  // Verificar cada tópico
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      foundTopics.push(topic);
    }
  });

  return foundTopics;
}

/**
 * Extrai entidades relevantes de um texto
 * Implementação simplificada baseada em padrões comuns
 */
export function extractEntities(text: string): string[] {
  if (!text) return [];

  const entities: string[] = [];

  // Extrair produtos (geralmente com nomes específicos e unidades)
  const productRegex = /\b([A-Z][a-zA-Z\s]+(?:True Source|[0-9]+(?:ml|g|kg)))\b/g;
  const productMatches = text.match(productRegex) || [];
  entities.push(...productMatches);

  // Extrair meses/períodos
  const monthRegex = /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|202[0-9])\b/gi;
  const monthMatches = text.match(monthRegex) || [];
  entities.push(...monthMatches.map(m => m.toLowerCase()));

  // Extrair números que podem ser quantidades
  const quantityRegex = /\b([0-9]+(?:\.[0-9]+)?)\s+(?:unidades|vendidos|vendidas)\b/g;
  const quantityMatches = text.match(quantityRegex) || [];
  entities.push(...quantityMatches);

  return [...new Set(entities)]; // Remover duplicatas
}

/**
 * Extrai perguntas anteriores de uma conversa
 */
export function extractPreviousQuestions(conversation: ConversationState, limit: number = 3): string[] {
  if (!conversation || !conversation.messages) return [];

  return conversation.messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .slice(-limit); // Pegar as últimas 'limit' perguntas
}

/**
 * Extrai tópicos de uma conversa inteira
 */
export function extractConversationTopics(conversation: ConversationState): string[] {
  // Lista de palavras-chave comuns em e-commerce
  const ecommerceKeywords = [
    'vendas', 'pedidos', 'produtos', 'clientes', 'faturamento',
    'receita', 'conversão', 'abandono', 'carrinho', 'checkout',
    'pagamento', 'entrega', 'frete', 'devolução', 'reembolso',
    'categoria', 'marca', 'preço', 'desconto', 'promoção',
    'estoque', 'inventário', 'marketing', 'campanha', 'sazonalidade',
    'ticket', 'médio', 'recorrência', 'retenção', 'aquisição'
  ];

  // Extrair mensagens de usuário
  const userMessages = conversation.messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.toLowerCase());

  // Juntar todas as mensagens em um único texto
  const allText = userMessages.join(' ');

  // Encontrar tópicos baseados nas palavras-chave
  const topics = ecommerceKeywords.filter(keyword =>
    allText.includes(keyword.toLowerCase())
  );

  // Adicionar tópicos específicos baseados em padrões
  if (allText.includes('último') || allText.includes('recente') ||
      allText.includes('mês passado') || allText.includes('semana passada')) {
    topics.push('período_recente');
  }

  if (allText.includes('comparar') || allText.includes('comparação') ||
      allText.includes('versus') || allText.includes('vs')) {
    topics.push('comparação');
  }

  if (allText.includes('crescimento') || allText.includes('aumento') ||
      allText.includes('queda') || allText.includes('tendência')) {
    topics.push('tendência');
  }

  // Remover duplicatas
  return [...new Set(topics)];
}

/**
 * Extrai entidades de uma conversa inteira
 */
export function extractConversationEntities(conversation: ConversationState): string[] {
  const entities: string[] = [];

  // Padrões para identificar entidades comuns em e-commerce
  const patterns = {
    productId: /\b(SKU|produto|código)\s*[:#]?\s*(\w{3,10})\b/i,
    categoryName: /\bcategor[ia]{1,2}\s*[de]?\s*['"]?([^'".,;!?]+)['"]?/i,
    brandName: /\bmarca\s*[de]?\s*['"]?([^'".,;!?]+)['"]?/i,
    dateRange: /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/i,
    year: /\b(20\d{2})\b/,
    percentage: /\b(\d{1,3})[%]\b/,
    monetaryValue: /\bR\$\s*(\d+(?:[,.]\d+)?)\b/
  };

  // Extrair mensagens de usuário
  const userMessages = conversation.messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content);

  // Processar cada mensagem
  userMessages.forEach(message => {
    // Verificar cada padrão
    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = message.match(pattern);
      if (matches && matches[1]) {
        // Adicionar entidade encontrada
        entities.push(`${type}:${matches[1].trim()}`);
      }
    });

    // Identificar números específicos que podem ser relevantes
    const numberMatches = message.match(/\b(\d+)\b/g);
    if (numberMatches && numberMatches.length > 0) {
      // Adicionar apenas números que parecem ser quantidades relevantes
      numberMatches
        .filter(num => parseInt(num) > 1 && parseInt(num) < 1000)
        .forEach(num => {
          if (message.includes('top') || message.includes('melhores') ||
              message.includes('piores') || message.includes('principais')) {
            entities.push(`top:${num}`);
          }
        });
    }
  });

  // Remover duplicatas
  return [...new Set(entities)];
}

/**
 * Extrai o contexto completo de uma conversa
 * @param conversation Estado da conversa
 * @returns Objeto de contexto da conversa
 */
export function extractConversationContext(conversation: ConversationState): ConversationContext {
  return {
    topics: extractConversationTopics(conversation),
    entities: extractConversationEntities(conversation),
    previousQuestions: extractPreviousQuestions(conversation)
  };
}
