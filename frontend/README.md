# GPTrue Chat - Interface de Teste

Esta é uma interface de chat simples para testar a API do GPTrue, um chatbot generativo para análise de dados de e-commerce.

## Funcionalidades

- Interface de chat intuitiva e responsiva
- Conexão com a API do GPTrue
- Suporte a conversas contextuais (manutenção de ID de conversa)
- Visualização de consultas SQL geradas
- Exibição de dados estruturados (tabelas)
- Sistema de feedback para respostas
- Sugestões de perguntas relacionadas
- Configurações personalizáveis
- Armazenamento local de configurações

## Como usar

1. Abra o arquivo `index.html` em um navegador moderno
2. Configure a URL da API no painel de configurações (padrão: `http://localhost:3000/conversation`)
3. Adicione uma API key se necessário
4. Clique em "Testar Conexão" para verificar se a API está acessível
5. Digite uma pergunta no campo de texto e pressione Enter ou clique no botão de envio
6. Utilize os botões de sugestão para fazer perguntas pré-definidas
7. Forneça feedback sobre as respostas usando os botões 👍 e 👎

## Exemplos de perguntas

- "Quais foram os 5 produtos mais vendidos no último mês?"
- "Qual o ticket médio dos pedidos em janeiro?"
- "Como está a taxa de conversão de assinaturas?"
- "Qual a distribuição geográfica dos clientes?"
- "Quais produtos têm o maior índice de recompra?"

## Configurações

- **URL da API**: Endereço base da API do GPTrue
- **API Key**: Chave de autenticação (se necessário)
- **ID da Conversa**: ID para manter contexto entre sessões
- **Mostrar SQL**: Exibe a consulta SQL gerada nas respostas
- **Modo de depuração**: Ativa logs detalhados no console

## Estrutura de arquivos

- `index.html`: Estrutura da interface
- `styles.css`: Estilos e layout
- `script.js`: Lógica de interação e comunicação com a API

## Requisitos técnicos

- Navegador moderno com suporte a ES6+
- Conexão com a API do GPTrue
- Servidor local ou acesso à internet para carregar fontes

## Desenvolvimento

Para modificar ou estender esta interface:

1. Clone o repositório
2. Edite os arquivos conforme necessário
3. Teste as alterações abrindo o arquivo `index.html` no navegador
4. Para personalizar o estilo, modifique as variáveis CSS no início do arquivo `styles.css`

## Limitações conhecidas

- A interface não implementa autenticação completa
- Não há suporte para upload de arquivos
- A visualização de dados é limitada a tabelas simples
- Não há persistência de histórico de conversas entre sessões (apenas o ID da conversa é salvo)

## Próximos passos

- Implementar autenticação completa
- Adicionar suporte a gráficos e visualizações avançadas
- Melhorar a persistência de dados
- Adicionar suporte a temas claro/escuro
- Implementar exportação de conversas 
