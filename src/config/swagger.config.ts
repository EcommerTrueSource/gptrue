import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('GPTrue API')
    .setDescription(`
      API do chatbot generativo para análise de dados de e-commerce.

      ## Visão Geral
      O GPTrue é um chatbot generativo integrado ao "Painel True", projetado para fornecer insights
      e análises sobre dados de e-commerce armazenados no BigQuery. O sistema utiliza técnicas
      avançadas de processamento de linguagem natural e busca vetorial para responder perguntas
      dos usuários em linguagem natural.

      ## Autenticação
      A API utiliza autenticação JWT (Bearer Token). Todos os endpoints requerem um token válido,
      exceto a documentação e endpoints de health check.

      ## Rate Limiting
      - Limite padrão: 100 requisições por minuto por IP
      - Endpoints de conversação: 30 requisições por minuto por usuário

      ## Respostas de Erro
      A API utiliza códigos de status HTTP padrão e retorna erros no formato:
      \`\`\`json
      {
        "statusCode": 400,
        "message": "Descrição do erro",
        "error": "Nome do erro",
        "details": { ... }
      }
      \`\`\`

      ## Endpoints Principais
      - **/api/conversation**: Endpoints para interação com o chatbot
      - **/api/admin**: Endpoints administrativos e métricas
    `)
    .setVersion('1.0')
    .setContact('Equipe GPTrue', 'https://www.truesource.com.br', 'gabriel.nascimento@truebrands.com.br')
    .setLicense('Proprietário', 'https://www.truesource.com.br/terms')
    .addServer('http://localhost:3000', 'Ambiente Local')
    .addServer('https://api.gptrue.truesource.com.br', 'Ambiente de Produção')
    .addTag('Conversação', 'Endpoints para interação com o chatbot')
    .addTag('Admin', 'Endpoints administrativos e métricas')
    .addTag('Feedback', 'Endpoints para gestão de feedback')
    .addTag('Health', 'Endpoints de health check')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Entre com seu token JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Configurações customizadas do Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'GPTrue API Documentation',
    customfavIcon: 'https://www.true.com.br/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        theme: 'monokai',
      },
    },
  });
}
