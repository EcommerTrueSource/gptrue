import axios from 'axios';
import readline from 'readline';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const API_TOKEN = process.env.API_TOKEN || 'mock-token';
const DEBUG = process.env.DEBUG === 'true';
const INCLUDE_SQL = process.env.INCLUDE_SQL === 'true';

// Interface para leitura de linha
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Estado da conversa
let conversationId: string | null = null;

// Função para logs de depuração
function debug(message: string, data?: any): void {
  if (DEBUG) {
    console.log(chalk.magenta('\n[DEBUG] ') + chalk.gray(message));
    if (data) {
      console.log(chalk.gray('---'));
      console.log(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
      console.log(chalk.gray('---'));
    }
  }
}

// Função para formatar a resposta
function formatResponse(response: any): void {
  console.log('\n' + chalk.green('=== Resposta do GPTrue ==='));
  console.log(chalk.white(response.message));

  if (INCLUDE_SQL && response.metadata?.sql) {
    console.log('\n' + chalk.blue('SQL Gerado:'));
    console.log(chalk.gray(response.metadata.sql));
  }

  if (response.metadata?.tables && response.metadata.tables.length > 0) {
    console.log('\n' + chalk.blue('Tabelas utilizadas:'));
    console.log(chalk.gray(response.metadata.tables.join(', ')));
  }

  if (response.suggestions && response.suggestions.length > 0) {
    console.log('\n' + chalk.blue('Sugestões de perguntas:'));
    response.suggestions.forEach((suggestion: string, index: number) => {
      console.log(chalk.gray(`${index + 1}. ${suggestion}`));
    });
  }

  console.log('\n' + chalk.blue('Metadados:'));
  console.log(chalk.gray(`Tempo de processamento: ${response.metadata?.processingTimeMs}ms`));
  console.log(chalk.gray(`Fonte: ${response.metadata?.source}`));
  console.log(chalk.gray(`Confiança: ${response.metadata?.confidence}`));

  console.log('\n' + chalk.yellow('Feedback:'));
  console.log(chalk.gray('1. Positivo  2. Negativo  3. Pular'));
}

// Função para enviar feedback
async function sendFeedback(type: 'positive' | 'negative', messageId: string): Promise<void> {
  try {
    if (!conversationId) return;

    const payload = {
      messageId,
      type,
      comment: '',
    };

    debug(`Enviando feedback ${type} para mensagem ${messageId}`, payload);

    const response = await axios.put(
      `${API_URL}/conversation/${conversationId}/feedback`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    debug('Resposta do feedback:', response.data);
    console.log(chalk.green(`\nFeedback ${type} enviado com sucesso!`));
  } catch (error) {
    debug('Erro ao enviar feedback:', error);
    console.error(chalk.red('\nErro ao enviar feedback:'), error);
  }
}

// Função para processar a pergunta
async function processQuestion(question: string): Promise<void> {
  try {
    console.log(chalk.yellow('\nProcessando pergunta...'));

    const payload = {
      message: question,
      conversationId,
      options: {
        includeSql: INCLUDE_SQL,
      },
    };

    debug('Enviando requisição para o backend:', {
      url: `${API_URL}/conversation`,
      payload,
    });

    const startTime = Date.now();
    const response = await axios.post(
      `${API_URL}/conversation`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const endTime = Date.now();

    debug(`Resposta recebida em ${endTime - startTime}ms:`, response.data);

    // Atualizar o ID da conversa se for a primeira mensagem
    if (!conversationId) {
      conversationId = response.data.conversationId;
      console.log(chalk.gray(`\nNova conversa iniciada (ID: ${conversationId})`));
    }

    formatResponse(response.data);

    // Solicitar feedback
    rl.question('\nFeedback (1-3): ', async (answer) => {
      if (answer === '1') {
        await sendFeedback('positive', response.data.id);
      } else if (answer === '2') {
        await sendFeedback('negative', response.data.id);
      }

      // Continuar a conversa
      askQuestion();
    });
  } catch (error) {
    debug('Erro ao processar pergunta:', error);
    console.error(chalk.red('\nErro ao processar pergunta:'), error);
    askQuestion();
  }
}

// Função para solicitar a próxima pergunta
function askQuestion(): void {
  rl.question(chalk.cyan('\nDigite sua pergunta (ou "sair" para encerrar): '), (question) => {
    if (question.toLowerCase() === 'sair') {
      console.log(chalk.green('\nAté a próxima!'));
      rl.close();
      return;
    }

    if (question.toLowerCase() === 'nova') {
      conversationId = null;
      console.log(chalk.green('\nNova conversa iniciada!'));
      askQuestion();
      return;
    }

    if (question.trim() === '') {
      console.log(chalk.yellow('\nPor favor, digite uma pergunta válida.'));
      askQuestion();
      return;
    }

    processQuestion(question);
  });
}

// Iniciar a CLI
console.log(chalk.green('=== GPTrue CLI ==='));
console.log(chalk.gray('Digite "sair" para encerrar ou "nova" para iniciar uma nova conversa.'));
console.log(chalk.gray(`Conectado a: ${API_URL}`));
if (DEBUG) {
  console.log(chalk.magenta('[DEBUG] Modo de depuração ativado'));
}
askQuestion();
