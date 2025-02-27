import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ConversationRequest, ConversationResponse } from '../interfaces/dtos';

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let conversationId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Simula autenticação
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'test@example.com',
        password: 'test123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve iniciar uma nova conversa', async () => {
    const pergunta: ConversationRequest = {
      message: 'Quais foram os 5 produtos mais vendidos no último mês?',
    };

    const response = await request(app.getHttpServer())
      .post('/conversation')
      .set('Authorization', `Bearer ${authToken}`)
      .send(pergunta)
      .expect(201);

    const body = response.body as ConversationResponse;
    expect(body.conversationId).toBeDefined();
    expect(body.message).toBeDefined();
    expect(body.metadata).toBeDefined();
    expect(body.feedbackOptions).toBeDefined();

    conversationId = body.conversationId;
  });

  it('deve continuar a conversa com uma pergunta relacionada', async () => {
    const perguntaRelacionada: ConversationRequest = {
      message: 'Qual foi o faturamento total desses produtos?',
      conversationId,
    };

    const response = await request(app.getHttpServer())
      .post('/conversation')
      .set('Authorization', `Bearer ${authToken}`)
      .send(perguntaRelacionada)
      .expect(201);

    const body = response.body as ConversationResponse;
    expect(body.conversationId).toBe(conversationId);
    expect(body.message).toBeDefined();
    expect(body.metadata).toBeDefined();
    expect(body.metadata.tables).toContain('PEDIDOS');
  });

  it('deve fornecer feedback positivo sobre a resposta', async () => {
    await request(app.getHttpServer())
      .put(`/conversation/${conversationId}/feedback`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'thumbsUp',
        comment: 'Resposta muito útil e precisa',
      })
      .expect(200);
  });

  it('deve lidar com perguntas complexas sobre análise de assinaturas', async () => {
    const perguntaAssinaturas: ConversationRequest = {
      message: 'Qual é a taxa de renovação das assinaturas nos últimos 3 meses?',
      conversationId,
      context: {
        timeRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      },
    };

    const response = await request(app.getHttpServer())
      .post('/conversation')
      .set('Authorization', `Bearer ${authToken}`)
      .send(perguntaAssinaturas)
      .expect(201);

    const body = response.body as ConversationResponse;
    expect(body.metadata.tables).toContain('ASSINATURA');
    expect(body.message).toContain('%');
  });

  it('deve lidar com erros graciosamente', async () => {
    const perguntaInvalida: ConversationRequest = {
      message: '',
      conversationId,
    };

    await request(app.getHttpServer())
      .post('/conversation')
      .set('Authorization', `Bearer ${authToken}`)
      .send(perguntaInvalida)
      .expect(400);
  });
});
