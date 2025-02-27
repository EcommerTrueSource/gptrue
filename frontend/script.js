document.addEventListener('DOMContentLoaded', () => {
  // Elementos da interface
  const messagesContainer = document.getElementById('messages-container');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-btn');
  const clearChatButton = document.getElementById('clear-chat');
  const testConnectionButton = document.getElementById('test-connection');
  const statusIndicator = document.getElementById('status-indicator');
  const connectionText = document.getElementById('connection-text');
  const apiUrlInput = document.getElementById('api-url');
  const apiKeyInput = document.getElementById('api-key');
  const conversationIdInput = document.getElementById('conversation-id');
  const showSqlCheckbox = document.getElementById('show-sql');
  const debugModeCheckbox = document.getElementById('debug-mode');

  // Estado da aplicação
  let currentConversationId = '';
  let isConnected = false;

  // Inicialização
  init();

  // Funções de inicialização
  function init() {
    // Carregar configurações salvas
    loadSettings();

    // Adicionar event listeners
    userInput.addEventListener('keydown', handleInputKeydown);
    sendButton.addEventListener('click', sendMessage);
    clearChatButton.addEventListener('click', clearChat);
    testConnectionButton.addEventListener('click', testConnection);

    // Adicionar event listeners para botões de sugestão
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        userInput.value = btn.textContent;
        sendMessage();
      });
    });

    // Auto-resize do textarea
    userInput.addEventListener('input', () => {
      userInput.style.height = 'auto';
      userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Testar conexão inicial
    testConnection();
  }

  function loadSettings() {
    // Carregar configurações do localStorage
    const settings = JSON.parse(localStorage.getItem('gptrue-settings') || '{}');

    if (settings.apiUrl) apiUrlInput.value = settings.apiUrl;
    if (settings.apiKey) apiKeyInput.value = settings.apiKey;
    if (settings.conversationId) conversationIdInput.value = settings.conversationId;
    if (settings.showSql !== undefined) showSqlCheckbox.checked = settings.showSql;
    if (settings.debugMode !== undefined) debugModeCheckbox.checked = settings.debugMode;

    // Restaurar ID da conversa atual
    currentConversationId = settings.conversationId || '';
  }

  function saveSettings() {
    // Salvar configurações no localStorage
    const settings = {
      apiUrl: apiUrlInput.value,
      apiKey: apiKeyInput.value,
      conversationId: currentConversationId,
      showSql: showSqlCheckbox.checked,
      debugMode: debugModeCheckbox.checked,
    };

    localStorage.setItem('gptrue-settings', JSON.stringify(settings));
  }

  // Funções de manipulação de eventos
  function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Adicionar mensagem do usuário ao chat
    addUserMessage(message);

    // Limpar input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Adicionar indicador de carregamento
    const loadingIndicator = addLoadingIndicator();

    try {
      // Enviar mensagem para a API
      const response = await callChatAPI(message);

      // Remover indicador de carregamento
      loadingIndicator.remove();

      // Adicionar resposta do bot ao chat
      addBotMessage(response);

      // Atualizar ID da conversa
      if (response.conversationId) {
        currentConversationId = response.conversationId;
        conversationIdInput.value = currentConversationId;
        saveSettings();
      }

      // Adicionar event listeners para botões de feedback
      setupFeedbackButtons();

      // Adicionar event listeners para botões de sugestão
      setupSuggestionButtons();
    } catch (error) {
      // Remover indicador de carregamento
      loadingIndicator.remove();

      // Adicionar mensagem de erro
      addErrorMessage(error.message);

      console.error('Erro ao enviar mensagem:', error);
    }

    // Rolar para o final do chat
    scrollToBottom();
  }

  async function callChatAPI(message) {
    const apiUrl = apiUrlInput.value;
    const apiKey = apiKeyInput.value;
    const conversationId = currentConversationId || conversationIdInput.value;
    const showSql = showSqlCheckbox.checked;

    const requestBody = {
      message,
      conversationId: conversationId || undefined,
      options: {
        includeSql: showSql,
      },
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async function sendFeedback(responseId, type, comment = '') {
    const apiUrl = apiUrlInput.value;
    const apiKey = apiKeyInput.value;

    const requestBody = {
      responseId,
      conversationId: currentConversationId,
      type,
      helpful: type === 'positive',
      comment,
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(
        `${apiUrl.replace(/\/$/, '')}/${currentConversationId}/feedback`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      return null;
    }
  }

  async function testConnection() {
    const apiUrl = apiUrlInput.value;
    const apiKey = apiKeyInput.value;

    statusIndicator.classList.remove('connected');
    connectionText.textContent = 'Testando...';

    try {
      const headers = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // Tentar fazer uma requisição para a API
      const response = await fetch(apiUrl.replace(/\/conversation$/, '/health'), {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        statusIndicator.classList.add('connected');
        connectionText.textContent = 'Conectado';
        isConnected = true;
      } else {
        connectionText.textContent = 'Erro de conexão';
        isConnected = false;
      }
    } catch (error) {
      connectionText.textContent = 'Desconectado';
      isConnected = false;
      console.error('Erro ao testar conexão:', error);
    }

    // Salvar configurações
    saveSettings();
  }

  function clearChat() {
    // Limpar todas as mensagens exceto a mensagem de boas-vindas
    const welcomeMessage = messagesContainer.querySelector('.system-message');
    messagesContainer.innerHTML = '';

    if (welcomeMessage) {
      messagesContainer.appendChild(welcomeMessage);
    }

    // Resetar ID da conversa
    currentConversationId = '';
    conversationIdInput.value = '';
    saveSettings();
  }

  // Funções de manipulação do DOM
  function addUserMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';

    const textElement = document.createElement('p');
    textElement.textContent = text;

    contentElement.appendChild(textElement);
    messageElement.appendChild(contentElement);
    messagesContainer.appendChild(messageElement);

    scrollToBottom();
  }

  function addBotMessage(response) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot-message';
    messageElement.dataset.responseId = response.id;

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';

    // Adicionar texto da resposta
    const textElement = document.createElement('p');
    textElement.textContent = response.message;
    contentElement.appendChild(textElement);

    // Adicionar SQL se disponível e solicitado
    if (showSqlCheckbox.checked && response.metadata && response.metadata.sql) {
      const sqlContainer = document.createElement('div');
      sqlContainer.className = 'sql-container';

      const sqlTitle = document.createElement('p');
      sqlTitle.className = 'sql-title';
      sqlTitle.textContent = 'SQL gerado:';

      const sqlCode = document.createElement('pre');
      const sqlCodeContent = document.createElement('code');
      sqlCodeContent.textContent = response.metadata.sql;

      sqlCode.appendChild(sqlCodeContent);
      sqlContainer.appendChild(sqlTitle);
      sqlContainer.appendChild(sqlCode);
      contentElement.appendChild(sqlContainer);
    }

    // Adicionar dados estruturados se disponíveis
    if (response.data && response.data.content) {
      const dataContainer = document.createElement('div');
      dataContainer.className = 'data-container';

      if (response.data.type === 'table' && Array.isArray(response.data.content)) {
        const table = createDataTable(response.data.content);
        dataContainer.appendChild(table);
      }

      contentElement.appendChild(dataContainer);
    }

    // Adicionar sugestões se disponíveis
    if (response.suggestions && response.suggestions.length > 0) {
      const suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = 'suggestions';

      const suggestionsTitle = document.createElement('p');
      suggestionsTitle.textContent = 'Sugestões:';
      suggestionsContainer.appendChild(suggestionsTitle);

      response.suggestions.forEach(suggestion => {
        const suggestionButton = document.createElement('button');
        suggestionButton.className = 'suggestion-btn';
        suggestionButton.textContent = suggestion;
        suggestionsContainer.appendChild(suggestionButton);
      });

      contentElement.appendChild(suggestionsContainer);
    }

    // Adicionar metadados
    if (response.metadata) {
      const metadataElement = document.createElement('div');
      metadataElement.className = 'message-metadata';

      const sourceElement = document.createElement('span');
      sourceElement.className = `message-source ${response.metadata.source}`;
      sourceElement.textContent = response.metadata.source === 'cache' ? 'Cache' : 'Consulta';

      const timeElement = document.createElement('span');
      timeElement.className = 'message-time';
      timeElement.textContent = `${response.metadata.processingTimeMs}ms`;

      metadataElement.appendChild(sourceElement);
      metadataElement.appendChild(timeElement);
      contentElement.appendChild(metadataElement);
    }

    // Adicionar opções de feedback
    if (response.feedbackOptions) {
      const feedbackContainer = document.createElement('div');
      feedbackContainer.className = 'feedback-options';

      const thumbsUpButton = document.createElement('button');
      thumbsUpButton.className = 'feedback-btn thumbs-up';
      thumbsUpButton.innerHTML = '👍 Útil';
      thumbsUpButton.dataset.type = 'positive';

      const thumbsDownButton = document.createElement('button');
      thumbsDownButton.className = 'feedback-btn thumbs-down';
      thumbsDownButton.innerHTML = '👎 Não útil';
      thumbsDownButton.dataset.type = 'negative';

      feedbackContainer.appendChild(thumbsUpButton);
      feedbackContainer.appendChild(thumbsDownButton);

      contentElement.appendChild(feedbackContainer);
    }

    messageElement.appendChild(contentElement);
    messagesContainer.appendChild(messageElement);

    scrollToBottom();
  }

  function addErrorMessage(errorText) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system-message error-message';

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';

    const textElement = document.createElement('p');
    textElement.textContent = `Erro: ${errorText}`;

    contentElement.appendChild(textElement);
    messageElement.appendChild(contentElement);
    messagesContainer.appendChild(messageElement);

    scrollToBottom();
  }

  function addLoadingIndicator() {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-indicator';

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'loading-dots';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dotsContainer.appendChild(dot);
    }

    loadingElement.appendChild(dotsContainer);
    messagesContainer.appendChild(loadingElement);

    scrollToBottom();

    return loadingElement;
  }

  function createDataTable(data) {
    if (!data || !data.length) return null;

    const table = document.createElement('table');
    table.className = 'data-table';

    // Criar cabeçalho
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    Object.keys(data[0]).forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Criar corpo da tabela
    const tbody = document.createElement('tbody');

    data.forEach(item => {
      const row = document.createElement('tr');

      Object.values(item).forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    return table;
  }

  function setupFeedbackButtons() {
    document.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const messageElement = e.target.closest('.message');
        const responseId = messageElement.dataset.responseId;
        const feedbackType = e.target.dataset.type;

        // Marcar botão como ativo
        const feedbackContainer = e.target.closest('.feedback-options');
        feedbackContainer.querySelectorAll('.feedback-btn').forEach(b => {
          b.classList.remove('active');
        });
        e.target.classList.add('active');

        // Enviar feedback
        await sendFeedback(responseId, feedbackType);

        // Adicionar campo de comentário se for feedback negativo
        if (feedbackType === 'negative' && !feedbackContainer.querySelector('.feedback-comment')) {
          const commentContainer = document.createElement('div');
          commentContainer.className = 'feedback-comment';

          const commentInput = document.createElement('textarea');
          commentInput.placeholder = 'Por que esta resposta não foi útil? (opcional)';
          commentInput.rows = 2;

          const sendCommentBtn = document.createElement('button');
          sendCommentBtn.className = 'btn btn-secondary';
          sendCommentBtn.textContent = 'Enviar';
          sendCommentBtn.addEventListener('click', async () => {
            const comment = commentInput.value.trim();
            if (comment) {
              await sendFeedback(responseId, feedbackType, comment);
              commentContainer.innerHTML = '<p class="feedback-thanks">Obrigado pelo feedback!</p>';
            }
          });

          commentContainer.appendChild(commentInput);
          commentContainer.appendChild(sendCommentBtn);
          feedbackContainer.appendChild(commentContainer);
        }
      });
    });
  }

  function setupSuggestionButtons() {
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        userInput.value = btn.textContent;
        sendMessage();
      });
    });
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
});
