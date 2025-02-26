export const TableSchemas = {
  PEDIDOS: {
    name: 'PEDIDOS',
    description: 'Armazena informações sobre pedidos de venda realizados na plataforma',
    fields: [
      {
        name: 'id_order_tiny',
        type: 'STRING',
        description: 'Identificador único do pedido',
      },
      {
        name: 'data_pedido',
        type: 'DATETIME',
        description: 'Data e hora da realização do pedido',
      },
      {
        name: 'data_entrega_prevista',
        type: 'DATETIME',
        description: 'Data estimada para entrega',
      },
      {
        name: 'situacao',
        type: 'STRING',
        description: 'Status atual do pedido',
      },
      {
        name: 'valor_frete',
        type: 'NUMERIC',
        description: 'Valor do frete',
      },
      {
        name: 'valor_desconto',
        type: 'NUMERIC',
        description: 'Valor do desconto aplicado',
      },
      {
        name: 'total_produtos',
        type: 'NUMERIC',
        description: 'Valor total dos produtos',
      },
      {
        name: 'total_pedido_pago',
        type: 'NUMERIC',
        description: 'Valor total pago no pedido',
      },
      {
        name: 'itensJSON',
        type: 'JSON',
        description: 'Lista de produtos em formato JSON com detalhes de cada item',
      },
      {
        name: 'metodo_pagamento',
        type: 'STRING',
        description: 'Forma de pagamento utilizada',
      },
      {
        name: 'assinatura_boleano',
        type: 'BOOLEAN',
        description: 'Indicador se o pedido é uma assinatura',
      },
      {
        name: 'assinatura_frequencia',
        type: 'STRING',
        description: 'Frequência da assinatura',
      },
    ],
  },
  PRODUTOS: {
    name: 'PRODUTOS',
    description: 'Catálogo de produtos disponíveis na plataforma',
    fields: [
      {
        name: 'id',
        type: 'STRING',
        description: 'Identificador único do SKU na VTEX',
      },
      {
        name: 'ProductRefId',
        type: 'STRING',
        description: 'Código do produto usado como SKU',
      },
      {
        name: 'NameComplete',
        type: 'STRING',
        description: 'Nome completo do produto',
      },
      {
        name: 'ProductDescription',
        type: 'STRING',
        description: 'Descrição detalhada',
      },
      {
        name: 'BrandName',
        type: 'STRING',
        description: 'Nome da marca',
      },
      {
        name: 'IsActive',
        type: 'BOOLEAN',
        description: 'Indicador se o produto está ativo',
      },
      {
        name: 'preco_custo_medio',
        type: 'NUMERIC',
        description: 'Custo médio para a empresa',
      },
      {
        name: 'saldo_estoque',
        type: 'NUMERIC',
        description: 'Quantidade disponível',
      },
    ],
  },
  ASSINATURA: {
    name: 'ASSINATURA',
    description: 'Gerencia produtos em regime de assinatura (recorrentes)',
    fields: [
      {
        name: 'id',
        type: 'STRING',
        description: 'Identificador único da assinatura',
      },
      {
        name: 'customerId',
        type: 'STRING',
        description: 'ID do cliente associado',
      },
      {
        name: 'customerEmail',
        type: 'STRING',
        description: 'Email do cliente',
      },
      {
        name: 'status',
        type: 'STRING',
        description: 'Estado atual da assinatura',
      },
      {
        name: 'nextPurchaseDate',
        type: 'DATETIME',
        description: 'Data da próxima compra prevista',
      },
      {
        name: 'lastPurchaseDate',
        type: 'DATETIME',
        description: 'Data da última compra realizada',
      },
      {
        name: 'cycleCount',
        type: 'INTEGER',
        description: 'Número de ciclos já realizados',
      },
    ],
  },
};
