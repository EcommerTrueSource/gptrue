# GPTrue - Chatbot Generativo para Análise de Dados de E-commerce

## Descrição
O GPTrue é um chatbot generativo integrado ao "Painel True", desenvolvido para fornecer insights e análises sobre dados de e-commerce armazenados no BigQuery. O sistema permite que usuários façam perguntas em linguagem natural sobre pedidos, produtos, vendas, assinantes, e outras métricas de negócio.

## Tecnologias Principais
- **Frontend**: NextJS 14+ com TypeScript
- **Backend**: NestJS 10+ com TypeScript
- **Vector Store**: Pinecone
- **Banco de dados**: Google BigQuery
- **IA Generativa**: Google Vertex AI e OpenAI API (GPT-4)
- **Orquestração**: LangChain
- **Cache**: Redis
- **Containerização**: Docker

## Pré-requisitos
- Node.js 18+
- Docker e Docker Compose
- Conta no Google Cloud Platform com BigQuery habilitado
- Chaves de API: OpenAI, Pinecone, Google Cloud

## Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/EcommerTrueSource/gptrue.git
cd gptrue
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Execute o projeto em desenvolvimento:
```bash
npm run start:dev
```

## Estrutura do Projeto
```
src/
├── modules/          # Módulos da aplicação
├── common/           # Código compartilhado
├── config/           # Configurações
├── database/         # Conexões com bancos
└── integrations/     # Integrações externas
```

## Scripts Disponíveis
- `npm run start:dev` - Inicia em modo desenvolvimento
- `npm run build` - Compila o projeto
- `npm run start:prod` - Inicia em modo produção
- `npm run test` - Executa testes
- `npm run lint` - Executa linter
- `npm run format` - Formata o código

## Contribuição
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request

## Licença
Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
