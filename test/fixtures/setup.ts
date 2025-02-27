import { config } from 'dotenv';
import { join } from 'path';

// Carrega variáveis de ambiente do arquivo .env.test
config({ path: join(__dirname, '../../.env.test') });

// Mock das APIs externas
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    preview: {
      generateText: jest.fn().mockResolvedValue({
        response: { candidates: [{ output: 'SELECT * FROM test' }] }
      })
    }
  }))
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Resposta mockada do GPT' } }]
        })
      }
    }
  }))
}));

jest.mock('@pinecone-database/pinecone', () => ({
  PineconeClient: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    Index: jest.fn().mockImplementation(() => ({
      upsert: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
      query: jest.fn().mockResolvedValue({
        matches: [
          {
            id: 'test-id',
            score: 0.95,
            metadata: {
              question: 'Pergunta teste',
              response: 'Resposta teste'
            }
          }
        ]
      })
    }))
  }))
}));
