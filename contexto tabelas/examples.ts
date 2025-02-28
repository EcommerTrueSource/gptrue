// Metadados para melhor compreensão do contexto
export const TABLE_SCHEMAS = {
  pedidos: {
    description: "Tabela de pedidos com informações detalhadas de vendas",
    fields: [
      { name: "id_order_tiny", type: "STRING", description: "ID do pedido no Tiny" },
      { name: "data_pedido", type: "DATETIME", description: "Data e hora do pedido" },
      { name: "numero_ecommerce", type: "STRING", description: "Número do pedido no e-commerce" },
      { name: "data_entrega_prevista", type: "DATETIME", description: "Data prevista para entrega" },
      { name: "id_user_vtex", type: "STRING", description: "ID do usuário na Vtex" },
      { name: "primeiro_nome", type: "STRING", description: "Primeiro nome do cliente" },
      { name: "last_name", type: "STRING", description: "Sobrenome do cliente" },
      { name: "email", type: "STRING", description: "Email do cliente" },
      { name: "id_vendedor", type: "STRING", description: "ID do vendedor" },
      { name: "nome_vendedor", type: "STRING", description: "Nome do vendedor" },
      { name: "situacao_anterior", type: "STRING", description: "Situação anterior do pedido" },
      { name: "situacao", type: "STRING", description: "Situação atual do pedido" },
      { name: "data_faturamento", type: "DATETIME", description: "Data de faturamento" },
      { name: "data_entrega_concluida", type: "DATETIME", description: "Data de entrega" },
      { name: "itens", type: "REPEATED", description: "Lista de itens do pedido" },
      { name: "itensJSON", type: "JSON", description: "Detalhes dos itens em formato JSON" },
      { name: "assinatura_boleano", type: "BOOLEAN", description: "Se é pedido de assinatura" },
      { name: "assinatura_frequencia", type: "STRING", description: "Frequência da assinatura" },
      { name: "assinatura_contagem", type: "NUMERIC", description: "Número de ciclos da assinatura" },
      { name: "nome_transportador", type: "STRING", description: "Nome do transportador" },
      { name: "valor_frete", type: "NUMERIC", description: "Valor do frete" },
      { name: "valor_desconto", type: "NUMERIC", description: "Valor total de descontos" },
      { name: "total_produtos", type: "NUMERIC", description: "Valor total dos produtos" },
      { name: "total_pedido_pago", type: "NUMERIC", description: "Valor total pago" },
      { name: "forma_frete", type: "STRING", description: "Método de envio" },
      { name: "codigo_rastreamento", type: "STRING", description: "Código de rastreamento" },
      { name: "url_rastreamento", type: "STRING", description: "URL de rastreamento" },
      { name: "id_nota_fiscal", type: "STRING", description: "ID da nota fiscal" },
      { name: "origempedido", type: "STRING", description: "Origem do pedido" },
      { name: "primeiracompra", type: "STRING", description: "Se é primeira compra" },
      { name: "bairro", type: "STRING", description: "Bairro de entrega" },
      { name: "cidade", type: "STRING", description: "Cidade de entrega" },
      { name: "uf", type: "STRING", description: "UF de entrega" },
      { name: "cep", type: "STRING", description: "CEP de entrega" },
      { name: "metodo_pagamento", type: "STRING", description: "Método de pagamento" },
      { name: "cupons", type: "REPEATED", description: "Lista de cupons aplicados" },
      { name: "cuponsJSON", type: "JSON", description: "Detalhes dos cupons em JSON" },
      { name: "promocoes", type: "REPEATED", description: "Lista de promoções aplicadas" },
      { name: "promocoesJSON", type: "JSON", description: "Detalhes das promoções em JSON" },
      { name: "count_sku_distinct", type: "NUMERIC", description: "Quantidade de SKUs distintos" },
      { name: "sum_sku_total", type: "NUMERIC", description: "Soma total de SKUs" },
      { name: "custo_produtos", type: "NUMERIC", description: "Custo total dos produtos" },
      { name: "custo_frete", type: "NUMERIC", description: "Custo do frete" },
      { name: "numero_order_tiny", type: "STRING", description: "Número do pedido no Tiny" },
      { name: "numero_nota_fiscal", type: "STRING", description: "Número da nota fiscal" },
      { name: "data_atualizacao_warehouse", type: "DATETIME", description: "Data da última atualização" }
    ]
  },
  clientes: {
    description: "Tabela de clientes do sistema com informações completas de cadastro",
    fields: [
      { name: "clientProfileData_id", type: "STRING", description: "ID do perfil do cliente" },
      { name: "id_tiny", type: "STRING", description: "ID do cliente no Tiny" },
      { name: "clientProfileData_email", type: "STRING", description: "Email do cliente" },
      { name: "clientProfileData_firstName", type: "STRING", description: "Primeiro nome" },
      { name: "clientProfileData_lastName", type: "STRING", description: "Sobrenome" },
      { name: "clientProfileData_documentType", type: "STRING", description: "Tipo de documento" },
      { name: "clientProfileData_document", type: "STRING", description: "Número do documento" },
      { name: "clientProfileData_phone", type: "STRING", description: "Telefone" },
      { name: "clientProfileData_userProfileId", type: "STRING", description: "ID do perfil de usuário" },
      { name: "clientProfileData_customerClass", type: "STRING", description: "Classe do cliente" },
      { name: "clientProfileData_customerCode", type: "STRING", description: "Código do cliente" },
      { name: "data_criacao", type: "DATETIME", description: "Data de criação" },
      { name: "tipo_pessoa", type: "STRING", description: "Tipo de pessoa" },
      { name: "cpf_cnpj", type: "STRING", description: "CPF ou CNPJ" },
      { name: "bairro", type: "STRING", description: "Bairro" },
      { name: "cep", type: "STRING", description: "CEP" },
      { name: "cidade", type: "STRING", description: "Cidade" },
      { name: "uf", type: "STRING", description: "Estado" },
      { name: "status_cliente", type: "STRING", description: "Status do cliente" },
      { name: "status_assinante", type: "STRING", description: "Status como assinante" },
      { name: "data_atualizacao_warehouse", type: "DATETIME", description: "Data da última atualização" }
    ]
  },
  produtos: {
    description: "Catálogo completo de produtos",
    fields: [
      { name: "id", type: "STRING", description: "ID do SKU na Vtex" },
      { name: "ProductId", type: "STRING", description: "ID do produto na Vtex" },
      { name: "NameComplete", type: "STRING", description: "Nome completo do produto" },
      { name: "ProductDescription", type: "STRING", description: "Descrição detalhada" },
      { name: "ProductRefId", type: "STRING", description: "Código de referência/SKU" },
      { name: "SkuName", type: "STRING", description: "Nome do SKU" },
      { name: "TaxCode", type: "STRING", description: "Código fiscal" },
      { name: "IsActive", type: "BOOLEAN", description: "Se está ativo" },
      { name: "IsTransported", type: "BOOLEAN", description: "Se pode ser transportado" },
      { name: "IsInventoried", type: "BOOLEAN", description: "Se tem controle de estoque" },
      { name: "IsGiftCardRecharge", type: "BOOLEAN", description: "Se é recarga de gift card" },
      { name: "BrandId", type: "STRING", description: "ID da marca" },
      { name: "BrandName", type: "STRING", description: "Nome da marca" },
      { name: "IsBrandActive", type: "BOOLEAN", description: "Se a marca está ativa" },
      { name: "Dimension_cubicweight", type: "FLOAT", description: "Peso cúbico" },
      { name: "Dimension_height", type: "FLOAT", description: "Altura em cm" },
      { name: "Dimension_length", type: "FLOAT", description: "Comprimento em cm" },
      { name: "Dimension_weight", type: "FLOAT", description: "Peso" },
      { name: "Dimension_width", type: "FLOAT", description: "Largura em cm" },
      { name: "ProductCategories", type: "REPEATED", description: "Categorias do produto" },
      { name: "Attachments", type: "JSON", description: "Anexos do produto" },
      { name: "KeyWords", type: "REPEATED", description: "Palavras-chave" },
      { name: "ReleaseDate", type: "DATETIME", description: "Data de lançamento" },
      { name: "ProductIsVisible", type: "BOOLEAN", description: "Se está visível" },
      { name: "ShowIfNotAvailable", type: "BOOLEAN", description: "Exibir se indisponível" },
      { name: "preco_custo_medio", type: "FLOAT", description: "Preço de custo médio" },
      { name: "saldo_estoque", type: "INTEGER", description: "Quantidade em estoque" },
      { name: "dias_zerado", type: "INTEGER", description: "Dias sem estoque" },
      { name: "data_atualizacao_warehouse", type: "DATETIME", description: "Data da última atualização" }
    ]
  },
  assinaturas: {
    description: "Controle de assinaturas ativas e histórico",
    fields: [
      { name: "id", type: "STRING", description: "ID da assinatura" },
      { name: "customerId", type: "STRING", description: "ID do cliente" },
      { name: "customerEmail", type: "STRING", description: "Email do cliente" },
      { name: "title", type: "STRING", description: "Título da assinatura" },
      { name: "status", type: "STRING", description: "Status da assinatura" },
      { name: "isSkipped", type: "BOOLEAN", description: "Se próximo ciclo foi pulado" },
      { name: "nextPurchaseDate", type: "STRING", description: "Data da próxima compra" },
      { name: "lastPurchaseDate", type: "STRING", description: "Data da última compra" },
      { name: "plan", type: "RECORD", description: "Detalhes do plano" },
      { name: "shippingAddress", type: "JSON", description: "Endereço de entrega" },
      { name: "purchaseSettings", type: "JSON", description: "Configurações de compra" },
      { name: "cycleCount", type: "INTEGER", description: "Número de ciclos" },
      { name: "createdAt", type: "STRING", description: "Data de criação" },
      { name: "lastUpdate", type: "STRING", description: "Última atualização" },
      { name: "items", type: "REPEATED", description: "Itens da assinatura" },
      { name: "cycles", type: "REPEATED", description: "Histórico de ciclos" },
      { name: "data_atualizacao_warehouse", type: "DATETIME", description: "Data da última atualização" }
    ]
  },
  status_assinantes: {
    description: "Histórico de status dos assinantes",
    fields: [
      { name: "customerId", type: "STRING", description: "ID do cliente" },
      { name: "email", type: "STRING", description: "Email do assinante" },
      { name: "status", type: "STRING", description: "Status atual (ACTIVE/PAUSED/CANCELED/EXPIRED)" },
      { name: "data_atualizacao_warehouse", type: "DATETIME", description: "Data da atualização" }
    ]
  },
  status_clientes: {
    description: "Histórico de status dos clientes (ativos = compra nos últimos 90 dias)",
    fields: [
      { name: "email", type: "STRING", description: "Email do cliente" },
      { name: "status", type: "STRING", description: "Status atual (ACTIVE/INACTIVE)" },
      { name: "data_atualizacao_warehouse", type: "DATETIME", description: "Data da atualização" }
    ]
  }
} as const;

export const METADATA = {
  database: "BigQuery",
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || "truebrands-warehouse",
  dataset: process.env.BIGQUERY_DATASET || "truebrands_warehouse",
  description: "Base de dados do sistema True Brands contendo informações de clientes, pedidos, produtos e assinaturas",
  tables: TABLE_SCHEMAS,
  defaultLimit: 1000
} as const;

// Sinônimos e termos comuns
export const FIELD_SYNONYMS = {
  // Clientes
  "cliente": ["usuário", "comprador", "assinante", "consumidor", "customer", "clientProfileData"],
  "email": ["e-mail", "endereço de email", "endereço eletrônico", "customerEmail", "clientProfileData_email"],
  "nome": ["nome completo", "primeiro nome", "sobrenome", "firstName", "lastName", "clientProfileData_firstName", "clientProfileData_lastName"],
  "documento": ["cpf", "cnpj", "documentos", "identificação", "document", "clientProfileData_document", "cpf_cnpj"],
  "telefone": ["celular", "contato", "fone", "número de telefone", "phone", "clientProfileData_phone"],
  "localização": ["endereço", "cidade", "estado", "uf", "cep", "bairro", "shippingAddress"],
  "classe_cliente": ["tipo cliente", "categoria cliente", "customerClass", "clientProfileData_customerClass"],

  // Pedidos
  "pedido": ["compra", "venda", "transação", "ordem", "order", "id_order_tiny", "numero_order_tiny"],
  "status_pedido": ["situação", "estado", "condição", "situacao", "situacao_anterior"],
  "valor": ["preço", "total", "montante", "quantia", "total_pedido_pago", "total_produtos", "valor_por"],
  "data_pedido": ["data", "período", "quando", "data_pedido", "data_faturamento", "data_entrega_prevista", "data_entrega_concluida"],
  "frete": ["entrega", "transporte", "shipping", "valor_frete", "forma_frete", "nome_transportador", "codigo_rastreamento"],
  "desconto": ["valor_desconto", "desconto aplicado", "abatimento", "promoção", "cupom"],
  "nota_fiscal": ["nf", "nota", "id_nota_fiscal", "numero_nota_fiscal"],
  "origem": ["canal", "marketplace", "origempedido"],
  "pagamento": ["forma de pagamento", "metodo_pagamento", "purchaseSettings"],

  // Produtos
  "produto": ["item", "mercadoria", "artigo", "sku", "ProductId", "ProductRefId"],
  "nome_produto": ["nome", "título", "descrição", "NameComplete", "SkuName", "ProductDescription"],
  "estoque": ["saldo", "quantidade", "disponibilidade", "saldo_estoque", "dias_zerado", "IsInventoried"],
  "marca": ["brand", "fabricante", "BrandName", "BrandId"],
  "preço_produto": ["valor", "custo", "preço de venda", "preco_custo_medio"],
  "dimensões": ["tamanho", "medidas", "peso", "Dimension_cubicweight", "Dimension_height", "Dimension_length", "Dimension_weight", "Dimension_width"],
  "categorias": ["categoria", "departamento", "ProductCategories"],
  "visibilidade": ["visível", "disponível", "ativo", "IsActive", "ProductIsVisible", "ShowIfNotAvailable"],

  // Assinaturas
  "assinatura": ["recorrência", "plano", "subscription", "assinatura_boleano", "plan"],
  "ciclo": ["período", "frequência", "intervalo", "cycleCount", "assinatura_frequencia", "assinatura_contagem"],
  "próxima_cobrança": ["próximo ciclo", "próxima compra", "renovação", "nextPurchaseDate"],
  "status_assinatura": ["status assinante", "situação assinatura", "status", "isSkipped"],
  "histórico": ["histórico ciclos", "cycles", "lastPurchaseDate"],

  // Status
  "status_cliente": ["situação cliente", "status_cliente", "status"],
  "status_assinante": ["situação assinante", "status_assinante", "status"],

  // Datas
  "data_atualização": ["última atualização", "data_atualizacao_warehouse", "lastUpdate", "createdAt"]
} as const;

// Padrões comuns de processamento
export const COMMON_PATTERNS = {
  periodo: {
    "hoje": "DATE(CURRENT_DATE())",
    "ontem": "DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)",
    "esta semana": "DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",
    "este mês": "DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)",
    "mês passado": "DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY)",
    "último mês": "DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)",
    "últimos 30 dias": "DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)",
    "este ano": "DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)",
    "ano passado": "DATE_SUB(CURRENT_DATE(), INTERVAL 730 DAY)",
    "último trimestre": "DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)",
    "último semestre": "DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)"
  },

  comparacoes_data: {
    "maior ou igual": "DATE(campo) >= DATE_SUB(CURRENT_DATE(), INTERVAL X DAY)",
    "menor ou igual": "DATE(campo) <= CURRENT_DATE()",
    "entre datas": "DATE(campo) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL X DAY) AND CURRENT_DATE()",
    "no dia": "DATE(campo) = CURRENT_DATE()",
    "no mês": "DATE_TRUNC(campo, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)",
    "no ano": "DATE_TRUNC(campo, YEAR) = DATE_TRUNC(CURRENT_DATE(), YEAR)",
    "mês específico": "DATE_TRUNC(campo, MONTH) = DATE(YEAR, MONTH, 1)",
    "ano específico": "DATE_TRUNC(campo, YEAR) = DATE(YEAR, 1, 1)"
  },

  agrupamentos_data: {
    "por dia": "DATE(campo)",
    "por semana": "DATE_TRUNC(campo, WEEK)",
    "por mês": "DATE_TRUNC(campo, MONTH)",
    "por trimestre": "DATE_TRUNC(campo, QUARTER)",
    "por semestre": "DATE_TRUNC(campo, MONTH) - use CASE para agrupar semestres",
    "por ano": "DATE_TRUNC(campo, YEAR)"
  },

  status_pedido: {
    "faturado": "situacao = 'Faturado'",
    "cancelado": "situacao = 'Cancelado'",
    "pendente": "situacao = 'Pendente'",
    "em processamento": "situacao = 'Em processamento'",
    "aguardando pagamento": "situacao = 'Aguardando pagamento'"
  },

  filtros_comuns: {
    "assinatura": "assinatura_boleano = TRUE",
    "não assinatura": "assinatura_boleano = FALSE",
    "pedido pago": "total_pedido_pago > 0",
    "cliente ativo": "status_cliente = 'Ativo'",
    "assinante ativo": "status_assinante = 'ACTIVE'"
  },

  status_assinatura: {
    "ativa": "ACTIVE",
    "pausada": "PAUSED",
    "cancelada": "CANCELED",
    "expirada": "EXPIRED",
    "pulada": "SKIPPED"
  },

  status_cliente: {
    "ativo": "ACTIVE",
    "inativo": "INACTIVE"
  },

  tipo_pessoa: {
    "física": "F",
    "jurídica": "J",
    "pf": "F",
    "pj": "J"
  },

  frequencia_assinatura: {
    "mensal": "MONTHLY",
    "bimestral": "BIMONTHLY",
    "trimestral": "QUARTERLY",
    "semestral": "SEMIANNUAL",
    "anual": "ANNUAL"
  },

  // Funções comuns do BigQuery
  bigquery_functions: {
    "extrair_data": "DATE(campo_timestamp)",
    "extrair_mes": "EXTRACT(MONTH FROM campo_timestamp)",
    "extrair_ano": "EXTRACT(YEAR FROM campo_timestamp)",
    "formatar_data": "FORMAT_TIMESTAMP('%Y-%m-%d', campo_timestamp)",
    "json_array": "JSON_EXTRACT_ARRAY(campo_json)",
    "json_valor": "JSON_EXTRACT_VALUE(campo_json, '$.caminho')",
    "json_numero": "CAST(JSON_EXTRACT_VALUE(campo_json, '$.caminho') AS NUMERIC)",
    "json_data": "PARSE_TIMESTAMP(JSON_EXTRACT_VALUE(campo_json, '$.caminho'))",
    "array_primeiro": "(SELECT valor FROM UNNEST(array_campo) LIMIT 1)",
    "array_ultimo": "(SELECT valor FROM UNNEST(array_campo) ORDER BY indice DESC LIMIT 1)",
    "array_contar": "(SELECT COUNT(*) FROM UNNEST(array_campo))",
    "array_somar": "(SELECT SUM(valor) FROM UNNEST(array_campo))",
    "texto_juntar": "CONCAT(campo1, ' ', campo2)",
    "texto_maiusculo": "UPPER(campo)",
    "texto_minusculo": "LOWER(campo)",
    "numero_formatar": "FORMAT('%d', numero)",
    "moeda_formatar": "FORMAT('%.2f', valor)",
    "data_formatar": "FORMAT_TIMESTAMP('%d/%m/%Y', data)",
    "hora_formatar": "FORMAT_TIMESTAMP('%H:%M', data)"
  }
} as const;

// Exemplos de queries com contexto e explicações detalhadas
export const QUERY_EXAMPLES = [
  {
    natural: "Mostrar pedidos de assinatura faturados nos últimos 5 dias",
    sql: `SELECT
      id_order_tiny,
      data_pedido,
      email,
      primeiro_nome,
      last_name,
      situacao,
      data_faturamento,
      assinatura_boleano,
      assinatura_frequencia,
      valor_frete,
      total_pedido_pago
    FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
    WHERE assinatura_boleano = TRUE
      AND data_faturamento >= DATETIME_SUB(CURRENT_DATETIME(), INTERVAL 5 DAY)
      AND data_faturamento IS NOT NULL
      AND situacao NOT IN ('Cancelado', 'Aguardando pagamento')
    ORDER BY data_faturamento DESC
    LIMIT ${METADATA.defaultLimit}`,
    description: "Lista pedidos de assinatura recentes com filtro correto de data",
    explanation: "Demonstra o uso correto de DATETIME_SUB e CURRENT_DATETIME para comparações de data"
  },
  {
    natural: "Análise de pedidos por período específico",
    sql: `SELECT
      COUNT(*) as total_pedidos,
      SUM(total_pedido_pago) as valor_total,
      DATE(data_faturamento) as data
    FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
    WHERE DATE(data_faturamento) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      AND data_faturamento IS NOT NULL
      AND situacao NOT IN ('Cancelado', 'Aguardando pagamento')
    GROUP BY data
    ORDER BY data DESC
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise temporal de pedidos com agregações",
    explanation: "Demonstra uso correto de funções de data e agregações"
  },
  {
    natural: "Mostrar todas as assinaturas ativas do cliente com email aninhacarneiro81@gmail.com",
    sql: `SELECT
      id,
      title,
      status,
      nextPurchaseDate,
      plan.frequency.interval as intervalo_meses,
      items[OFFSET(0)].skuId as produto_id,
      items[OFFSET(0)].priceAtSubscriptionDate as valor_produto
    FROM \`${METADATA.project}.${METADATA.dataset}.assinaturas\`
    WHERE customerEmail = 'aninhacarneiro81@gmail.com'
      AND status = 'ACTIVE'
    ORDER BY nextPurchaseDate
    LIMIT ${METADATA.defaultLimit}`,
    description: "Lista todas as assinaturas ativas de um cliente específico com detalhes de produto e próxima cobrança",
    explanation: "Esta query demonstra o uso de arrays no BigQuery (items[OFFSET(0)]) e acesso a campos aninhados (plan.frequency.interval)"
  },
  {
    natural: "Buscar dados completos do cliente com id_tiny 918415307 incluindo status de assinatura",
    sql: `WITH cliente_atual AS (
      SELECT
        c.*,
        sa.status as status_assinatura_atual,
        ROW_NUMBER() OVER(PARTITION BY sa.email ORDER BY sa.data_atualizacao_warehouse DESC) as rn
      FROM \`${METADATA.project}.${METADATA.dataset}.clientes\` c
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_assinantes\` sa
        ON c.clientProfileData_email = sa.email
      WHERE c.id_tiny = '918415307'
    )
    SELECT * EXCEPT(rn)
    FROM cliente_atual
    WHERE rn = 1
    LIMIT 1`,
    description: "Retorna informações detalhadas do cliente com seu status mais recente de assinatura",
    explanation: "Utiliza CTE (WITH) e window functions (ROW_NUMBER) para obter o status mais atual"
  },
  {
    natural: "Análise completa do pedido faturado número 925466264 com informações do cliente e produtos",
    sql: `WITH info_pedido AS (
      SELECT
        p.*,
        c.clientProfileData_firstName,
        c.clientProfileData_lastName,
        c.status_cliente,
        JSON_EXTRACT_ARRAY(p.itensJSON) as items_array
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.clientes\` c
        ON p.email = c.clientProfileData_email
      WHERE p.id_order_tiny = '925466264'
        AND p.situacao = 'Faturado'
    )
    SELECT
      *,
      (SELECT COUNT(*) FROM UNNEST(items_array)) as total_items,
      (SELECT SUM(CAST(JSON_EXTRACT(item, '$.valor_por') AS INT64))
       FROM UNNEST(items_array) as item) as valor_total_items
    FROM info_pedido
    LIMIT 1`,
    description: "Análise detalhada de um pedido com processamento de JSON e agregações",
    explanation: "Demonstra uso de funções JSON do BigQuery e subqueries com UNNEST para arrays"
  },
  {
    natural: "Histórico completo de status do assinante montanaricamila@gmail.com com análise de mudanças",
    sql: `WITH historico_ordenado AS (
      SELECT
        email,
        status,
        data_atualizacao_warehouse,
        LAG(status) OVER(PARTITION BY email ORDER BY data_atualizacao_warehouse) as status_anterior
      FROM \`${METADATA.project}.${METADATA.dataset}.status_assinantes\`
      WHERE email = 'montanaricamila@gmail.com'
    )
    SELECT
      email,
      status,
      status_anterior,
      data_atualizacao_warehouse,
      CASE
        WHEN status != status_anterior OR status_anterior IS NULL
        THEN 'Mudança de Status'
        ELSE 'Sem Alteração'
      END as tipo_atualizacao
    FROM historico_ordenado
    ORDER BY data_atualizacao_warehouse DESC
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise temporal do histórico de status com detecção de mudanças",
    explanation: "Utiliza window functions (LAG) para comparar registros consecutivos"
  },
  {
    natural: "Qual o produto mais vendido em janeiro de 2025?",
    sql: `WITH itens_vendidos AS (
      SELECT
        JSON_EXTRACT_VALUE(item, '$.codigo') as codigo_produto,
        CAST(JSON_EXTRACT_VALUE(item, '$.quantidade') AS INT64) as quantidade
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`,
      UNNEST(JSON_EXTRACT_ARRAY(itensJSON)) as item
      WHERE DATE(data_pedido) BETWEEN '2025-01-01' AND '2025-01-31'
        AND situacao = 'Faturado'
    )
    SELECT
      p.NameComplete as nome_produto,
      p.BrandName as marca,
      SUM(i.quantidade) as total_vendido,
      p.saldo_estoque as estoque_atual
    FROM itens_vendidos i
    JOIN \`${METADATA.project}.${METADATA.dataset}.produtos\` p ON p.id = i.codigo_produto
    GROUP BY p.NameComplete, p.BrandName, p.saldo_estoque
    ORDER BY total_vendido DESC
    LIMIT 10`,
    description: "Análise de produtos mais vendidos com informações de estoque",
    explanation: "Demonstra o uso de UNNEST com JSON_EXTRACT_ARRAY para processar arrays JSON"
  },
  {
    natural: "Mostrar histórico de status de assinatura do cliente email@exemplo.com",
    sql: `WITH historico_completo AS (
      SELECT
        sa.email,
        sa.status as status_assinatura,
        sa.data_atualizacao_warehouse,
        c.clientProfileData_firstName,
        c.clientProfileData_lastName,
        c.status_cliente
      FROM \`${METADATA.project}.${METADATA.dataset}.status_assinantes\` sa
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.clientes\` c
        ON sa.email = c.clientProfileData_email
      WHERE sa.email = 'email@exemplo.com'
    )
    SELECT
      email,
      clientProfileData_firstName || ' ' || clientProfileData_lastName as nome_completo,
      status_assinatura,
      status_cliente,
      data_atualizacao_warehouse,
      LAG(status_assinatura) OVER(ORDER BY data_atualizacao_warehouse) as status_anterior
    FROM historico_completo
    ORDER BY data_atualizacao_warehouse DESC
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise temporal do histórico de status de assinatura",
    explanation: "Utiliza window functions (LAG) para detectar mudanças de status"
  },
  {
    natural: "Listar pedidos de assinatura faturados nos últimos 30 dias",
    sql: `SELECT
      p.id_order_tiny,
      p.data_pedido,
      p.email,
      p.primeiro_nome || ' ' || p.last_name as nome_cliente,
      p.situacao,
      p.assinatura_frequencia,
      p.total_pedido_pago,
      JSON_EXTRACT_ARRAY(p.itensJSON) as itens,
      a.nextPurchaseDate as proxima_entrega
    FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.assinaturas\` a
      ON p.email = a.customerEmail
    WHERE p.assinatura_boleano = true
      AND p.situacao = 'Faturado'
      AND p.data_faturamento >= DATETIME(TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY))
    ORDER BY p.data_pedido DESC
    LIMIT ${METADATA.defaultLimit}`,
    description: "Lista pedidos de assinatura recentes com detalhes",
    explanation: "Demonstra junção entre pedidos e assinaturas com filtros temporais e conversão correta de tipos de data"
  },
  {
    natural: "Análise de clientes ativos que não são assinantes",
    sql: `WITH clientes_ativos AS (
      SELECT
        c.*,
        COALESCE(sa.status, 'NAO_ASSINANTE') as status_assinatura
      FROM \`${METADATA.project}.${METADATA.dataset}.clientes\` c
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_assinantes\` sa
        ON c.clientProfileData_email = sa.email
      WHERE c.status_cliente = 'ACTIVE'
    )
    SELECT
      clientProfileData_firstName || ' ' || clientProfileData_lastName as nome_completo,
      clientProfileData_email,
      cidade,
      uf,
      status_cliente,
      status_assinatura,
      data_atualizacao_warehouse
    FROM clientes_ativos
    WHERE status_assinatura = 'NAO_ASSINANTE'
    ORDER BY data_atualizacao_warehouse DESC
    LIMIT ${METADATA.defaultLimit}`,
    description: "Identifica clientes ativos que podem ser convertidos em assinantes",
    explanation: "Usa LEFT JOIN para identificar clientes sem assinatura"
  },
  {
    natural: "Mostrar pedidos de assinatura faturados nos últimos 2 dias",
    sql: `SELECT
      p.id_order_tiny,
      p.data_pedido,
      p.data_faturamento,
      p.email,
      p.primeiro_nome,
      p.last_name,
      p.assinatura_frequencia,
      p.total_pedido_pago,
      p.situacao,
      p.numero_nota_fiscal,
      i.nome_produto,
      i.quantidade,
      i.valor_por as valor_unitario
    FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p,
    UNNEST(itens) as i
    WHERE
      p.assinatura_boleano = true
      AND DATE(p.data_faturamento) >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
      AND p.data_faturamento IS NOT NULL
      AND p.situacao NOT IN ('Cancelado', 'Aguardando pagamento')
    ORDER BY
      p.data_faturamento DESC,
      p.id_order_tiny
    LIMIT ${METADATA.defaultLimit}`,
    description: "Lista pedidos de assinatura recentes com detalhes dos itens usando UNNEST",
    explanation: "Usa DATE_SUB e CURRENT_DATE() para comparação com campo DATETIME"
  },
  {
    natural: "Análise completa de cliente com status de assinatura e pedidos",
    sql: `SELECT
      -- Dados do Cliente
      c.clientProfileData_email,
      c.clientProfileData_firstName,

      -- Status do Cliente/Assinante
      sc.status as status_cliente,
      sa.status as status_assinante,

      -- Dados do Pedido
      p.id_order_tiny,
      p.data_pedido,
      p.assinatura_boleano,

      -- Dados do Produto
      prod.NameComplete as nome_produto,

      -- Dados da Assinatura
      a.status as status_assinatura,
      a.nextPurchaseDate
    FROM \`${METADATA.project}.${METADATA.dataset}.clientes\` c
    -- Join com Status Cliente
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_clientes\` sc
      ON c.clientProfileData_email = sc.email
    -- Join com Status Assinante
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_assinantes\` sa
      ON c.clientProfileData_email = sa.email
    -- Join com Pedidos
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.pedidos\` p
      ON c.clientProfileData_email = p.email
    -- Join com Produtos
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.produtos\` prod
      ON (SELECT codigo FROM UNNEST(p.itens) LIMIT 1) = prod.ProductRefId
    -- Join com Assinaturas
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.assinaturas\` a
      ON c.clientProfileData_email = a.customerEmail
    WHERE c.clientProfileData_email IS NOT NULL
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise completa de cliente com todos os relacionamentos",
    explanation: "Demonstra o uso correto de múltiplos JOINs e acesso a arrays com UNNEST"
  },
  {
    natural: "Análise de taxa de renovação das assinaturas mensais",
    sql: `WITH AssinaturasAtivas AS (
      SELECT
        customerId,
        assinatura_frequencia,
        COUNT(*) as ciclos_renovados
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
      WHERE
        assinatura_boleano = true
        AND assinatura_frequencia LIKE '%MONTHLY%'
      GROUP BY customerId, assinatura_frequencia
    )
    SELECT
      assinatura_frequencia,
      COUNT(*) as total_assinantes,
      AVG(ciclos_renovados) as media_ciclos_renovados,
      COUNT(CASE WHEN ciclos_renovados > 1 THEN 1 END) * 100.0 / COUNT(*) as taxa_renovacao
    FROM AssinaturasAtivas
    GROUP BY assinatura_frequencia
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise de renovação de assinaturas",
    explanation: "Demonstra uso de CTEs e cálculos estatísticos"
  },
  {
    natural: "Análise de churn de assinaturas por mês",
    sql: `WITH Assinantes AS (
      SELECT
        FORMAT_DATE('%Y-%m', data_atualizacao_warehouse) as mes,
        COUNT(DISTINCT email) as total_assinantes
      FROM \`${METADATA.project}.${METADATA.dataset}.status_assinantes\`
      WHERE status = 'active'
      GROUP BY mes
    ),
    Cancelamentos AS (
      SELECT
        FORMAT_DATE('%Y-%m', data_atualizacao_warehouse) as mes,
        COUNT(DISTINCT email) as total_cancelamentos
      FROM \`${METADATA.project}.${METADATA.dataset}.status_assinantes\`
      WHERE status = 'canceled'
      GROUP BY mes
    )
    SELECT
      a.mes,
      a.total_assinantes,
      c.total_cancelamentos,
      ROUND(c.total_cancelamentos * 100.0 / a.total_assinantes, 2) as taxa_churn
    FROM Assinantes a
    LEFT JOIN Cancelamentos c ON a.mes = c.mes
    ORDER BY a.mes
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise de churn mensal",
    explanation: "Demonstra uso de múltiplas CTEs e cálculos percentuais"
  },
  {
    natural: "Análise de produtos complementares em assinaturas",
    sql: `WITH ParesProdutos AS (
      SELECT
        i1.nome_produto as produto1,
        i2.nome_produto as produto2,
        COUNT(*) as frequencia
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p,
      UNNEST(itens) as i1,
      UNNEST(itens) as i2
      WHERE
        p.assinatura_boleano = true
        AND i1.nome_produto < i2.nome_produto
      GROUP BY produto1, produto2
    )
    SELECT
      produto1,
      produto2,
      frequencia,
      RANK() OVER (ORDER BY frequencia DESC) as ranking
    FROM ParesProdutos
    ORDER BY frequencia DESC
    LIMIT 10`,
    description: "Análise de produtos frequentemente comprados juntos",
    explanation: "Demonstra self-join em array usando UNNEST e window functions"
  },
  {
    natural: "Análise de vendas por dia da semana do último mês",
    sql: `SELECT
      EXTRACT(DAYOFWEEK FROM data_pedido) as dia_semana,
      COUNT(*) as total_pedidos,
      SUM(total_pedido_pago) as valor_total,
      AVG(total_pedido_pago) as ticket_medio
    FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
    WHERE DATE_TRUNC(data_pedido, MONTH) = DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
      AND data_pedido IS NOT NULL
      AND situacao = 'Faturado'
    GROUP BY dia_semana
    ORDER BY dia_semana
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise de performance por dia da semana",
    explanation: "Demonstra uso de EXTRACT(DAYOFWEEK) e DATE_TRUNC para análise temporal"
  },
  {
    natural: "Média móvel de vendas dos últimos 7 dias por produto",
    sql: `WITH vendas_diarias AS (
      SELECT
        DATE(p.data_pedido) as data,
        i.nome_produto,
        SUM(i.quantidade) as quantidade_vendida
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p,
      UNNEST(itens) as i
      WHERE DATE(p.data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        AND p.data_pedido IS NOT NULL
        AND p.situacao = 'Faturado'
      GROUP BY data, i.nome_produto
    )
    SELECT
      data,
      nome_produto,
      quantidade_vendida,
      AVG(quantidade_vendida) OVER (
        PARTITION BY nome_produto
        ORDER BY data
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
      ) as media_movel_7_dias
    FROM vendas_diarias
    ORDER BY data DESC, nome_produto
    LIMIT ${METADATA.defaultLimit}`,
    description: "Cálculo de média móvel com window functions",
    explanation: "Demonstra uso de window functions para análise temporal"
  },
  {
    natural: "Comparativo de vendas ano atual vs ano anterior por mês",
    sql: `WITH vendas_mensais AS (
      SELECT
        FORMAT_DATE('%Y-%m', data_pedido) as mes,
        EXTRACT(YEAR FROM data_pedido) as ano,
        SUM(total_pedido_pago) as valor_total
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
      WHERE data_pedido IS NOT NULL
        AND situacao = 'Faturado'
        AND EXTRACT(YEAR FROM data_pedido) >= EXTRACT(YEAR FROM CURRENT_DATE()) - 1
      GROUP BY mes, ano
    )
    SELECT
      FORMAT_DATE('%m', DATE(CONCAT(mes, '-01'))) as mes,
      SUM(CASE WHEN ano = EXTRACT(YEAR FROM CURRENT_DATE()) THEN valor_total ELSE 0 END) as valor_atual,
      SUM(CASE WHEN ano = EXTRACT(YEAR FROM CURRENT_DATE()) - 1 THEN valor_total ELSE 0 END) as valor_anterior,
      ROUND(
        (SUM(CASE WHEN ano = EXTRACT(YEAR FROM CURRENT_DATE()) THEN valor_total ELSE 0 END) /
        NULLIF(SUM(CASE WHEN ano = EXTRACT(YEAR FROM CURRENT_DATE()) - 1 THEN valor_total ELSE 0 END), 0) - 1) * 100,
        2
      ) as variacao_percentual
    FROM vendas_mensais
    GROUP BY mes
    ORDER BY mes
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise comparativa ano a ano",
    explanation: "Demonstra uso de FORMAT_DATE e EXTRACT para comparações anuais"
  },
  {
    natural: "Análise de retenção de assinantes por coorte mensal",
    sql: `WITH primeira_compra AS (
      SELECT
        email,
        DATE_TRUNC(data_pedido, MONTH) as cohort_month,
        MIN(data_pedido) as primeira_compra
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
      WHERE assinatura_boleano = TRUE
        AND situacao = 'Faturado'
      GROUP BY email, cohort_month
    ),
    meses_ativos AS (
      SELECT
        p.email,
        pm.cohort_month,
        DATE_TRUNC(p.data_pedido, MONTH) as activity_month,
        DATE_DIFF(
          DATE_TRUNC(p.data_pedido, MONTH),
          pm.cohort_month,
          MONTH
        ) as months_since_first
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p
      JOIN primeira_compra pm ON p.email = pm.email
      WHERE p.assinatura_boleano = TRUE
        AND p.situacao = 'Faturado'
    )
    SELECT
      cohort_month,
      months_since_first,
      COUNT(DISTINCT email) as active_users,
      ROUND(
        COUNT(DISTINCT email) * 100.0 /
        FIRST_VALUE(COUNT(DISTINCT email))
        OVER (PARTITION BY cohort_month ORDER BY months_since_first),
        2
      ) as retention_rate
    FROM meses_ativos
    GROUP BY cohort_month, months_since_first
    HAVING cohort_month >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH), MONTH)
    ORDER BY cohort_month, months_since_first
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise de cohort para retenção de assinantes",
    explanation: "Demonstra análise avançada de retenção usando window functions e cohorts mensais"
  },
  {
    natural: "Análise de performance de produtos em assinaturas",
    sql: `WITH produtos_assinatura AS (
      SELECT
        p.id_produto,
        p.nome_produto,
        p.referencia,
        COUNT(DISTINCT ped.id_order_tiny) as total_pedidos_assinatura,
        COUNT(DISTINCT ped.email) as total_assinantes,
        SUM(ped.total_pedido_pago) as receita_total,
        AVG(ped.total_pedido_pago) as ticket_medio
      FROM \`${METADATA.project}.${METADATA.dataset}.produtos\` p
      JOIN \`${METADATA.project}.${METADATA.dataset}.pedidos\` ped
        ON p.id_produto = ped.id_produto
      WHERE ped.assinatura_boleano = TRUE
        AND ped.situacao = 'Faturado'
        AND DATE(ped.data_pedido) >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY), DAY)
      GROUP BY p.id_produto, p.nome_produto, p.referencia
    )
    SELECT
      id_produto,
      nome_produto,
      referencia,
      total_pedidos_assinatura,
      total_assinantes,
      ROUND(receita_total, 2) as receita_total,
      ROUND(ticket_medio, 2) as ticket_medio,
      ROUND(
        total_assinantes * 100.0 / SUM(total_assinantes) OVER(),
        2
      ) as percentual_assinantes
    FROM produtos_assinatura
    WHERE total_assinantes >= 5
    ORDER BY total_assinantes DESC
    LIMIT ${METADATA.defaultLimit}`,
    description: "Análise de produtos mais vendidos em assinaturas",
    explanation: "Demonstra análise de produtos com métricas de performance em assinaturas"
  },
  {
    natural: "total de vendas por mês",
    sql: `SELECT
  DATE_TRUNC(data_pedido, MONTH) as mes,
  COUNT(1) as total_pedidos,
  SUM(total_pedido_pago) as total_vendas
FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
WHERE data_pedido IS NOT NULL
  AND situacao = 'Faturado'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 1000`,
    description: "Exemplo de agregação mensal com total de pedidos e valor"
  },
  {
    natural: "clientes que fizeram mais de 3 pedidos nos últimos 30 dias",
    sql: `SELECT
  p.email,
  c.clientProfileData_firstName as nome,
  COUNT(1) as total_pedidos,
  SUM(p.total_pedido_pago) as total_gasto
FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p
LEFT JOIN \`truebrands-warehouse.truebrands_warehouse.clientes\` c
  ON p.email = c.clientProfileData_email
WHERE DATE(p.data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND p.data_pedido IS NOT NULL
  AND p.situacao = 'Faturado'
GROUP BY 1, 2
HAVING COUNT(1) > 3
ORDER BY total_pedidos DESC
LIMIT 1000`,
    description: "Exemplo de JOIN com agregação e filtro temporal"
  },
  {
    natural: "produtos mais vendidos por assinatura",
    sql: `SELECT
  item.nome_produto,
  COUNT(1) as total_pedidos,
  SUM(CAST(item.quantidade AS INT64)) as quantidade_total
FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p,
UNNEST(itens) as item
WHERE p.assinatura_boleano = TRUE
  AND p.situacao = 'Faturado'
  AND DATE(p.data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 1
ORDER BY quantidade_total DESC
LIMIT 1000`,
    description: "Exemplo de UNNEST com array de itens e filtro de assinatura"
  },
  {
    natural: 'Qual o estado que mais comprou em fevereiro de 2025?',
    sql: `SELECT
  uf,
  COUNT(DISTINCT id_order_tiny) as total_pedidos,
  ROUND(SUM(total_pedido_pago)/100, 2) as total_vendas,
  COUNT(DISTINCT email) as total_clientes,
  ROUND(AVG(total_pedido_pago)/100, 2) as ticket_medio
FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
WHERE DATE(data_pedido) BETWEEN '2025-02-01' AND '2025-02-28'
  AND situacao NOT IN ('8', '0', '2') -- Exclui apenas pedidos não faturados: Dados Incompletos, Aberta, Cancelada
GROUP BY uf
ORDER BY total_vendas DESC
LIMIT 1000`,
    description: 'Análise de vendas por estado em fevereiro/2025 considerando todos os pedidos faturados (exceto status 8, 0 e 2). Retorna total de pedidos, valor total de vendas, número de clientes únicos e ticket médio por estado.',
    results: [{
      "uf": "SP",
      "total_pedidos": "581",
      "total_vendas": "145104.72",
      "total_clientes": "570",
      "ticket_medio": "270.72"
    },
    {
      "uf": "MG",
      "total_pedidos": "231",
      "total_vendas": "54709.66",
      "total_clientes": "231",
      "ticket_medio": "260.52"
    }]
  }
] as const;

// Exemplos adicionais de CTEs para análises avançadas
export const QUERY_EXAMPLES_ADVANCED = [
  {
    natural: "Análise de cadeia de indicações (referrals) usando CTE recursiva",
    sql: `WITH RECURSIVE cadeia_indicacoes AS (
  -- Base: Clientes que não foram indicados (início da cadeia)
  SELECT
    email,
    primeiro_nome,
    codigo_indicacao,
    0 as nivel_indicacao,
    CAST(email as STRING) as caminho_indicacao
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
  WHERE codigo_indicador IS NULL
    AND codigo_indicacao IS NOT NULL

  UNION ALL

  -- Parte recursiva: encontra quem usou o código de indicação
  SELECT
    p.email,
    p.primeiro_nome,
    p.codigo_indicacao,
    ci.nivel_indicacao + 1,
    CONCAT(ci.caminho_indicacao, ' > ', p.email) as caminho_indicacao
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p
  INNER JOIN cadeia_indicacoes ci
    ON p.codigo_indicador = ci.codigo_indicacao
  WHERE ci.nivel_indicacao < 5  -- Limita a 5 níveis de profundidade
)
SELECT
  nivel_indicacao,
  COUNT(DISTINCT email) as total_clientes,
  STRING_AGG(DISTINCT caminho_indicacao, '\\n') as caminhos_indicacao
FROM cadeia_indicacoes
GROUP BY nivel_indicacao
ORDER BY nivel_indicacao`,
    description: "Exemplo de CTE recursiva para analisar a cadeia de indicações, mostrando quantos níveis de profundidade cada indicação gerou"
  },
  {
    natural: "Análise de funil de conversão completo usando múltiplas CTEs",
    sql: `WITH visitas_site AS (
  SELECT
    DATE(timestamp) as data,
    COUNT(DISTINCT session_id) as total_visitas,
    COUNT(DISTINCT CASE WHEN page_type = 'product' THEN session_id END) as visitas_produto,
    COUNT(DISTINCT CASE WHEN page_type = 'cart' THEN session_id END) as acessos_carrinho
  FROM \`truebrands-warehouse.truebrands_warehouse.analytics_events\`
  WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY DATE(timestamp)
),
pedidos_dia AS (
  SELECT
    DATE(data_pedido) as data,
    COUNT(DISTINCT id_order_tiny) as total_pedidos,
    COUNT(DISTINCT CASE WHEN assinatura_boleano = true THEN id_order_tiny END) as pedidos_assinatura
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
  WHERE DATE(data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND situacao NOT IN ('Cancelado', 'Aguardando pagamento')
  GROUP BY DATE(data_pedido)
)
SELECT
  v.data,
  v.total_visitas,
  v.visitas_produto,
  v.acessos_carrinho,
  p.total_pedidos,
  p.pedidos_assinatura,
  ROUND(p.total_pedidos * 100.0 / NULLIF(v.total_visitas, 0), 2) as taxa_conversao_geral,
  ROUND(p.pedidos_assinatura * 100.0 / NULLIF(p.total_pedidos, 0), 2) as taxa_conversao_assinatura
FROM visitas_site v
LEFT JOIN pedidos_dia p ON v.data = p.data
ORDER BY v.data DESC`,
    description: "Análise completa do funil de conversão, desde visitas ao site até conversão em assinaturas"
  },
  {
    natural: "Cálculo de LTV (Lifetime Value) por tipo de cliente",
    sql: `WITH primeira_compra AS (
  SELECT
    email,
    MIN(DATE(data_pedido)) as data_primeira_compra
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
  WHERE situacao NOT IN ('Cancelado', 'Aguardando pagamento')
  GROUP BY email
),
compras_cliente AS (
  SELECT
    p.email,
    pc.data_primeira_compra,
    COUNT(DISTINCT p.id_order_tiny) as total_pedidos,
    SUM(p.total_pedido_pago) / 100.0 as valor_total_compras,
    DATE_DIFF(CURRENT_DATE(), pc.data_primeira_compra, DAY) as dias_cliente,
    CASE
      WHEN p.assinatura_boleano = true THEN 'Assinante'
      ELSE 'Não Assinante'
    END as tipo_cliente
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p
  JOIN primeira_compra pc ON p.email = pc.email
  WHERE p.situacao NOT IN ('Cancelado', 'Aguardando pagamento')
  GROUP BY p.email, pc.data_primeira_compra, tipo_cliente
)
SELECT
  tipo_cliente,
  FLOOR(dias_cliente / 30) as mes_como_cliente,
  COUNT(DISTINCT email) as total_clientes,
  ROUND(AVG(total_pedidos), 2) as media_pedidos,
  ROUND(AVG(valor_total_compras), 2) as ltv_medio,
  ROUND(SUM(valor_total_compras) / COUNT(DISTINCT email), 2) as receita_por_cliente
FROM compras_cliente
GROUP BY tipo_cliente, mes_como_cliente
ORDER BY tipo_cliente, mes_como_cliente`,
    description: "Análise detalhada do valor vitalício do cliente (LTV) separando assinantes e não assinantes"
  },
  {
    natural: "Análise avançada de cohorts com retenção e valor",
    sql: `WITH primeira_compra AS (
  SELECT
    email,
    DATE_TRUNC(DATE(data_pedido), MONTH) as cohort_month,
    total_pedido_pago / 100.0 as valor_primeira_compra
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
  WHERE (email, data_pedido) IN (
    SELECT
      email,
      MIN(data_pedido)
    FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
    WHERE situacao NOT IN ('Cancelado', 'Aguardando pagamento')
    GROUP BY email
  )
),
compras_mensais AS (
  SELECT
    p.email,
    pc.cohort_month,
    DATE_TRUNC(DATE(p.data_pedido), MONTH) as mes_compra,
    COUNT(DISTINCT p.id_order_tiny) as total_pedidos,
    SUM(p.total_pedido_pago) / 100.0 as valor_total_mes
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p
  JOIN primeira_compra pc ON p.email = pc.email
  WHERE p.situacao NOT IN ('Cancelado', 'Aguardando pagamento')
  GROUP BY p.email, pc.cohort_month, mes_compra
),
metricas_cohort AS (
  SELECT
    cohort_month,
    mes_compra,
    DATE_DIFF(mes_compra, cohort_month, MONTH) as mes_indice,
    COUNT(DISTINCT email) as clientes_ativos,
    ROUND(AVG(valor_total_mes), 2) as valor_medio_mes,
    ROUND(SUM(valor_total_mes), 2) as receita_total
  FROM compras_mensais
  GROUP BY cohort_month, mes_compra
)
SELECT
  FORMAT_DATE('%Y-%m', cohort_month) as cohort,
  mes_indice,
  clientes_ativos,
  valor_medio_mes,
  receita_total,
  ROUND(clientes_ativos * 100.0 / FIRST_VALUE(clientes_ativos)
    OVER (PARTITION BY cohort_month ORDER BY mes_compra), 2) as retencao_percentual
FROM metricas_cohort
WHERE cohort_month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
ORDER BY cohort_month, mes_indice`,
    description: "Análise completa de cohorts mostrando retenção e valor médio por mês desde a primeira compra"
  },
  {
    natural: "Análise de comportamento do usuário com UNION de eventos",
    sql: `WITH eventos_combinados AS (
  -- Visualizações de produto
  SELECT
    session_id,
    'view' as evento_tipo,
    timestamp as evento_data,
    product_id as produto_id
  FROM \`truebrands-warehouse.truebrands_warehouse.analytics_events\`
  WHERE page_type = 'product'

  UNION ALL

  -- Adições ao carrinho
  SELECT
    session_id,
    'cart' as evento_tipo,
    timestamp as evento_data,
    product_id as produto_id
  FROM \`truebrands-warehouse.truebrands_warehouse.analytics_events\`
  WHERE event_type = 'add_to_cart'

  UNION ALL

  -- Compras realizadas
  SELECT
    session_id,
    'purchase' as evento_tipo,
    data_pedido as evento_data,
    codigo as produto_id
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p,
  UNNEST(JSON_EXTRACT_ARRAY(itensJSON)) as item
  WHERE situacao NOT IN ('Cancelado', 'Aguardando pagamento')
),
metricas_produto AS (
  SELECT
    produto_id,
    COUNT(DISTINCT CASE WHEN evento_tipo = 'view' THEN session_id END) as total_views,
    COUNT(DISTINCT CASE WHEN evento_tipo = 'cart' THEN session_id END) as total_cart_adds,
    COUNT(DISTINCT CASE WHEN evento_tipo = 'purchase' THEN session_id END) as total_purchases
  FROM eventos_combinados
  WHERE DATE(evento_data) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY produto_id
)
SELECT
  p.NameComplete as nome_produto,
  m.total_views,
  m.total_cart_adds,
  m.total_purchases,
  ROUND(m.total_cart_adds * 100.0 / NULLIF(m.total_views, 0), 2) as taxa_adicao_carrinho,
  ROUND(m.total_purchases * 100.0 / NULLIF(m.total_cart_adds, 0), 2) as taxa_conversao_compra
FROM metricas_produto m
JOIN \`truebrands-warehouse.truebrands_warehouse.produtos\` p
  ON m.produto_id = p.id
WHERE m.total_views > 0
ORDER BY m.total_views DESC
LIMIT 100`,
    description: "Análise unificada do comportamento do usuário combinando eventos de visualização, carrinho e compra"
  },
  {
    natural: "Qual a taxa de conversão de assinaturas do último mês?",
    sql: `WITH total_clientes AS (
  SELECT
    COUNT(DISTINCT email) as clientes_totais,
    COUNTIF(assinatura_boleano = true) as clientes_assinatura
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
  WHERE DATE(data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND situacao NOT IN ('Cancelado', 'Aguardando pagamento')
)
SELECT
  clientes_totais,
  clientes_assinatura,
  ROUND(clientes_assinatura * 100.0 / clientes_totais, 2) as taxa_conversao
FROM total_clientes`,
    description: "Calcula a taxa de conversão de assinaturas usando CTE para organizar a lógica"
  },
  {
    natural: "Qual o ticket médio por categoria de produto nos últimos 3 meses?",
    sql: `WITH vendas_categoria AS (
  SELECT
    p.categoria,
    COUNT(DISTINCT p.id_pedido) as total_pedidos,
    SUM(p.valor_total) as valor_total
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p
  WHERE DATE(p.data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    AND p.situacao NOT IN ('Cancelado', 'Aguardando pagamento')
)
SELECT
  categoria,
  total_pedidos,
  ROUND(valor_total / total_pedidos, 2) as ticket_medio
FROM vendas_categoria
ORDER BY ticket_medio DESC`,
    description: "Análise de ticket médio por categoria usando CTE para organização"
  },
  {
    natural: "Qual a taxa de retenção de assinantes mês a mês?",
    sql: `WITH meses AS (
  SELECT DISTINCT DATE_TRUNC(data_pedido, MONTH) as mes
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
  WHERE DATE(data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)
),
assinantes_mes AS (
  SELECT
    DATE_TRUNC(data_pedido, MONTH) as mes,
    COUNT(DISTINCT email) as total_assinantes
  FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
  WHERE assinatura_boleano = true
    AND situacao NOT IN ('Cancelado', 'Aguardando pagamento')
  GROUP BY 1
)
SELECT
  atual.mes,
  atual.total_assinantes,
  anterior.total_assinantes as assinantes_mes_anterior,
  ROUND(atual.total_assinantes * 100.0 / anterior.total_assinantes, 2) as taxa_retencao
FROM assinantes_mes atual
LEFT JOIN assinantes_mes anterior
  ON atual.mes = DATE_ADD(anterior.mes, INTERVAL 1 MONTH)
ORDER BY atual.mes`,
    description: "Análise complexa de retenção usando múltiplas CTEs e self-join"
  }
] as const;

// Templates de queries parametrizadas com explicações detalhadas
export const QUERY_TEMPLATES = {
  busca_assinatura_cliente: {
    template: `WITH info_assinatura AS (
      SELECT
        a.*,
        c.clientProfileData_firstName,
        c.clientProfileData_lastName,
        c.status_cliente
      FROM \`${METADATA.project}.${METADATA.dataset}.assinaturas\` a
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.clientes\` c
        ON a.customerEmail = c.clientProfileData_email
      WHERE a.customerEmail = @email
        AND a.status = @status
    )
    SELECT
      id,
      title,
      status,
      nextPurchaseDate,
      plan.frequency.interval as intervalo_meses,
      clientProfileData_firstName,
      clientProfileData_lastName,
      status_cliente,
      ARRAY(
        SELECT AS STRUCT
          skuId,
          quantity,
          priceAtSubscriptionDate
        FROM UNNEST(items)
      ) as produtos
    FROM info_assinatura
    ORDER BY nextPurchaseDate
    LIMIT ${METADATA.defaultLimit}`,
    parameters: ["email", "status"],
    description: "Busca assinaturas de um cliente com informações completas",
    parameterDescriptions: {
      email: "Email do cliente (ex: cliente@email.com)",
      status: "Status da assinatura (ACTIVE, CANCELED, etc)"
    }
  },

  analise_pedido_detalhada: {
    template: `WITH dados_pedido AS (
      SELECT
        p.*,
        c.clientProfileData_firstName,
        c.clientProfileData_lastName,
        c.status_cliente,
        sa.status as status_assinatura
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.clientes\` c
        ON p.email = c.clientProfileData_email
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_assinantes\` sa
        ON p.email = sa.email
        AND DATE(p.data_pedido) = DATE(sa.data_atualizacao_warehouse)
      WHERE p.id_order_tiny = @id_pedido
    )
    SELECT
      *,
      JSON_EXTRACT_ARRAY(itensJSON) as items_detalhados,
      JSON_EXTRACT_ARRAY(promocoesJSON) as promocoes_aplicadas
    FROM dados_pedido
    LIMIT 1`,
    parameters: ["id_pedido"],
    description: "Análise completa de pedido com dados relacionados",
    parameterDescriptions: {
      id_pedido: "ID do pedido no Tiny (ex: 925466264)"
    }
  },

  monitoramento_estoque: {
    template: `SELECT
      p.id,
      p.ProductId,
      p.NameComplete,
      p.BrandName,
      p.saldo_estoque,
      p.dias_zerado,
      COUNT(DISTINCT o.id_order_tiny) as pedidos_ultimos_30_dias,
      ARRAY_AGG(STRUCT(
        o.id_order_tiny,
        o.data_pedido,
        o.situacao
      ) ORDER BY o.data_pedido DESC LIMIT 5) as ultimos_pedidos
    FROM \`${METADATA.project}.${METADATA.dataset}.produtos\` p
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.pedidos\` o
      ON JSON_EXTRACT_VALUE(o.itensJSON, '$[0].codigo') = p.id
      AND o.data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    WHERE p.saldo_estoque <= @limite_estoque
      AND p.IsActive = true
    GROUP BY 1,2,3,4,5,6
    ORDER BY p.dias_zerado DESC, pedidos_ultimos_30_dias DESC
    LIMIT ${METADATA.defaultLimit}`,
    parameters: ["limite_estoque"],
    description: "Monitoramento avançado de estoque com análise de demanda",
    parameterDescriptions: {
      limite_estoque: "Limite de estoque para alerta (ex: 10)"
    }
  },

  analise_status_cliente: {
    template: `WITH historico_status AS (
      SELECT
        sc.email,
        sc.status as status_cliente,
        sc.data_atualizacao_warehouse,
        sa.status as status_assinatura,
        ROW_NUMBER() OVER(PARTITION BY sc.email, DATE(sc.data_atualizacao_warehouse)
                         ORDER BY sc.data_atualizacao_warehouse DESC) as rn
      FROM \`${METADATA.project}.${METADATA.dataset}.status_clientes\` sc
      LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_assinantes\` sa
        ON sc.email = sa.email
        AND DATE(sc.data_atualizacao_warehouse) = DATE(sa.data_atualizacao_warehouse)
      WHERE sc.email = @email
    )
    SELECT
      email,
      status_cliente,
      status_assinatura,
      data_atualizacao_warehouse,
      LAG(status_cliente) OVER(ORDER BY data_atualizacao_warehouse) as status_cliente_anterior,
      LAG(status_assinatura) OVER(ORDER BY data_atualizacao_warehouse) as status_assinatura_anterior
    FROM historico_status
    WHERE rn = 1
    ORDER BY data_atualizacao_warehouse DESC
    LIMIT ${METADATA.defaultLimit}`,
    parameters: ["email"],
    description: "Análise temporal completa de status do cliente",
    parameterDescriptions: {
      email: "Email do cliente para análise"
    }
  },

  analise_cliente_completa: {
    template: `SELECT
      -- Dados do Cliente
      c.clientProfileData_email,
      c.clientProfileData_firstName,

      -- Status do Cliente/Assinante
      sc.status as status_cliente,
      sa.status as status_assinante,

      -- Dados do Pedido
      p.id_order_tiny,
      p.data_pedido,
      p.assinatura_boleano,

      -- Dados do Produto
      prod.NameComplete as nome_produto,

      -- Dados da Assinatura
      a.status as status_assinatura,
      a.nextPurchaseDate
    FROM \`${METADATA.project}.${METADATA.dataset}.clientes\` c
    -- Join com Status Cliente
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_clientes\` sc
      ON c.clientProfileData_email = sc.email
    -- Join com Status Assinante
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.status_assinantes\` sa
      ON c.clientProfileData_email = sa.email
    -- Join com Pedidos
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.pedidos\` p
      ON c.clientProfileData_email = p.email
    -- Join com Produtos
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.produtos\` prod
      ON (SELECT codigo FROM UNNEST(p.itens) LIMIT 1) = prod.ProductRefId
    -- Join com Assinaturas
    LEFT JOIN \`${METADATA.project}.${METADATA.dataset}.assinaturas\` a
      ON c.clientProfileData_email = a.customerEmail
    WHERE c.clientProfileData_email = @email
    LIMIT ${METADATA.defaultLimit}`,
    parameters: ["email"],
    description: "Análise completa de cliente com todos os relacionamentos",
    parameterDescriptions: {
      email: "Email do cliente para análise"
    }
  },

  analise_renovacao_assinaturas: {
    template: `WITH AssinaturasAtivas AS (
      SELECT
        customerId,
        assinatura_frequencia,
        COUNT(*) as ciclos_renovados
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
      WHERE
        assinatura_boleano = true
        AND assinatura_frequencia = @frequencia
        AND data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL @dias DAY)
      GROUP BY customerId, assinatura_frequencia
    )
    SELECT
      assinatura_frequencia,
      COUNT(*) as total_assinantes,
      AVG(ciclos_renovados) as media_ciclos_renovados,
      COUNT(CASE WHEN ciclos_renovados > 1 THEN 1 END) * 100.0 / COUNT(*) as taxa_renovacao
    FROM AssinaturasAtivas
    GROUP BY assinatura_frequencia
    LIMIT ${METADATA.defaultLimit}`,
    parameters: ["frequencia", "dias"],
    description: "Análise de renovação de assinaturas por frequência",
    parameterDescriptions: {
      frequencia: "Frequência da assinatura (MONTHLY, QUARTERLY, etc)",
      dias: "Período de análise em dias"
    }
  },

  analise_churn: {
    template: `WITH Assinantes AS (
      SELECT
        FORMAT_DATE('%Y-%m', data_atualizacao_warehouse) as mes,
        COUNT(DISTINCT email) as total_assinantes
      FROM \`${METADATA.project}.${METADATA.dataset}.status_assinantes\`
      WHERE status = 'active'
        AND data_atualizacao_warehouse >= DATE_SUB(CURRENT_DATE(), INTERVAL @meses MONTH)
      GROUP BY mes
    ),
    Cancelamentos AS (
      SELECT
        FORMAT_DATE('%Y-%m', data_atualizacao_warehouse) as mes,
        COUNT(DISTINCT email) as total_cancelamentos
      FROM \`${METADATA.project}.${METADATA.dataset}.status_assinantes\`
      WHERE status = 'canceled'
        AND data_atualizacao_warehouse >= DATE_SUB(CURRENT_DATE(), INTERVAL @meses MONTH)
      GROUP BY mes
    )
    SELECT
      a.mes,
      a.total_assinantes,
      c.total_cancelamentos,
      ROUND(c.total_cancelamentos * 100.0 / a.total_assinantes, 2) as taxa_churn
    FROM Assinantes a
    LEFT JOIN Cancelamentos c ON a.mes = c.mes
    ORDER BY a.mes
    LIMIT ${METADATA.defaultLimit}`,
    parameters: ["meses"],
    description: "Análise de churn mensal",
    parameterDescriptions: {
      meses: "Número de meses para análise"
    }
  },

  analise_produtos_complementares: {
    template: `WITH ParesProdutos AS (
      SELECT
        i1.nome_produto as produto1,
        i2.nome_produto as produto2,
        COUNT(*) as frequencia
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\` p,
      UNNEST(itens) as i1,
      UNNEST(itens) as i2
      WHERE
        p.assinatura_boleano = @apenas_assinaturas
        AND p.data_pedido >= DATE_SUB(CURRENT_DATE(), INTERVAL @dias DAY)
        AND i1.nome_produto < i2.nome_produto
      GROUP BY produto1, produto2
      HAVING frequencia >= @min_frequencia
    )
    SELECT
      produto1,
      produto2,
      frequencia,
      RANK() OVER (ORDER BY frequencia DESC) as ranking
    FROM ParesProdutos
    ORDER BY frequencia DESC
    LIMIT 10`,
    parameters: ["apenas_assinaturas", "dias", "min_frequencia"],
    description: "Análise de produtos frequentemente comprados juntos",
    parameterDescriptions: {
      apenas_assinaturas: "Se deve considerar apenas pedidos de assinatura",
      dias: "Período de análise em dias",
      min_frequencia: "Frequência mínima de ocorrência do par"
    }
  },

  analise_assinatura_periodo: {
    template: `WITH metricas_periodo AS (
      SELECT
        DATE_TRUNC(data_pedido, @intervalo) as periodo,
        COUNT(DISTINCT CASE WHEN assinatura_boleano THEN email END) as novos_assinantes,
        COUNT(DISTINCT email) as total_clientes,
        SUM(CASE WHEN assinatura_boleano THEN total_pedido_pago ELSE 0 END) as receita_assinaturas,
        SUM(total_pedido_pago) as receita_total
      FROM \`${METADATA.project}.${METADATA.dataset}.pedidos\`
      WHERE data_pedido BETWEEN @data_inicio AND @data_fim
        AND situacao = 'Faturado'
      GROUP BY periodo
    )
    SELECT
      periodo,
      novos_assinantes,
      total_clientes,
      ROUND(receita_assinaturas, 2) as receita_assinaturas,
      ROUND(receita_total, 2) as receita_total,
      ROUND(novos_assinantes * 100.0 / total_clientes, 2) as taxa_conversao,
      ROUND(receita_assinaturas * 100.0 / receita_total, 2) as percentual_receita_assinaturas
    FROM metricas_periodo
    ORDER BY periodo DESC
    LIMIT ${METADATA.defaultLimit}`,
    parameters: ["intervalo", "data_inicio", "data_fim"],
    description: "Análise de métricas de assinatura por período",
    parameterDescriptions: {
      intervalo: "Intervalo de agrupamento (DAY, WEEK, MONTH)",
      data_inicio: "Data inicial do período (YYYY-MM-DD)",
      data_fim: "Data final do período (YYYY-MM-DD)"
    }
  },

  vendas_periodo: {
    template: `SELECT
  DATE_TRUNC(data_pedido, {periodo}) as periodo,
  COUNT(1) as total_pedidos,
  SUM(total_pedido_pago) as total_vendas
FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\`
WHERE DATE(data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL {dias} DAY)
  AND data_pedido IS NOT NULL
  AND situacao = 'Faturado'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 1000`,
    description: "Template para análise de vendas por período",
    parameters: ["periodo", "dias"]
  },

  clientes_recorrentes: {
    template: `SELECT
  p.email,
  c.clientProfileData_firstName as nome,
  COUNT(1) as total_pedidos,
  SUM(p.total_pedido_pago) as total_gasto,
  MIN(DATE(p.data_pedido)) as primeira_compra,
  MAX(DATE(p.data_pedido)) as ultima_compra
FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p
LEFT JOIN \`truebrands-warehouse.truebrands_warehouse.clientes\` c
  ON p.email = c.clientProfileData_email
WHERE DATE(p.data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL {dias} DAY)
  AND p.data_pedido IS NOT NULL
  AND p.situacao = 'Faturado'
GROUP BY 1, 2
HAVING COUNT(1) >= {min_pedidos}
ORDER BY total_pedidos DESC
LIMIT 1000`,
    description: "Template para análise de clientes recorrentes",
    parameters: ["dias", "min_pedidos"]
  },

  analise_produtos: {
    template: `SELECT
  item.nome_produto,
  COUNT(DISTINCT p.id_order_tiny) as total_pedidos,
  SUM(CAST(item.quantidade AS INT64)) as quantidade_total,
  SUM(CAST(item.quantidade AS INT64) * CAST(item.preco AS FLOAT64)) as valor_total
FROM \`truebrands-warehouse.truebrands_warehouse.pedidos\` p,
UNNEST(itens) as item
WHERE DATE(p.data_pedido) >= DATE_SUB(CURRENT_DATE(), INTERVAL {dias} DAY)
  AND p.situacao = 'Faturado'
  {filtro_assinatura}
GROUP BY 1
ORDER BY {ordem} DESC
LIMIT 1000`,
    description: "Template para análise de produtos",
    parameters: ["dias", "filtro_assinatura", "ordem"]
  }
} as const;
