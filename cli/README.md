# GPTrue CLI

Uma interface de linha de comando simples para testar o GPTrue, um chatbot generativo para análise de dados de e-commerce.

## Instalação

```bash
# Instalar dependências
npm install

# Compilar o código TypeScript
npm run build
```

## Uso

```bash
# Executar a CLI
npm start

# Ou, para desenvolvimento (sem compilação)
npm run dev
```

## Comandos disponíveis

Durante a execução da CLI, você pode usar os seguintes comandos:

- Digite sua pergunta em linguagem natural para obter uma resposta
- Digite `nova` para iniciar uma nova conversa
- Digite `sair` para encerrar a CLI

## Configuração

Edite o arquivo `.env` para configurar:

- `API_URL`: URL da API do GPTrue (padrão: http://localhost:3000/api)
- `API_TOKEN`: Token de autenticação (padrão: mock-token)
- `DEBUG`: Ativar modo de depuração (padrão: false)
- `INCLUDE_SQL`: Incluir SQL gerado na resposta (padrão: true)

## Exemplos de perguntas

- "Quais foram os 5 produtos mais vendidos no último mês?"
- "Qual o ticket médio dos pedidos em janeiro?"
- "Como está a taxa de conversão de assinaturas?"
- "Quantos clientes novos tivemos nos últimos 3 meses?"
- "Qual a região com maior volume de vendas?" 
