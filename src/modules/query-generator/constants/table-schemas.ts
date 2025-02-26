import { TableSchema } from '../interfaces/query-generator.interface';

export const TABLE_SCHEMAS: TableSchema[] = [
  {
    name: 'PEDIDOS',
    description: 'Armazena informações sobre pedidos de venda realizados na plataforma',
    fields: [
      {
        name: 'id_order_tiny',
        type: 'STRING',
        description: 'Identificador único do pedido',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'data_pedido',
        type: 'DATETIME',
        description: 'Data e hora da realização do pedido',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'data_entrega_prevista',
        type: 'DATETIME',
        description: 'Data estimada para entrega',
        isSearchable: true,
      },
      {
        name: 'situacao',
        type: 'STRING',
        description: 'Status atual do pedido',
        examples: [
          'Aguardando pagamento',
          'Pagamento aprovado',
          'Em separação',
          'Enviado',
          'Entregue',
        ],
        isSearchable: true,
      },
      {
        name: 'valor_frete',
        type: 'NUMERIC',
        description: 'Valor do frete',
      },
      {
        name: 'valor_desconto',
        type: 'NUMERIC',
        description: 'Valor total de descontos aplicados',
      },
      {
        name: 'total_produtos',
        type: 'NUMERIC',
        description: 'Valor total dos produtos sem frete e descontos',
      },
      {
        name: 'total_pedido_pago',
        type: 'NUMERIC',
        description: 'Valor total pago incluindo frete e descontos',
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
        isSearchable: true,
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
        examples: ['30 dias', '60 dias', '90 dias'],
      },
      {
        name: 'cuponsJSON',
        type: 'JSON',
        description: 'Detalhes de cupons aplicados ao pedido',
      },
      {
        name: 'promocoesJSON',
        type: 'JSON',
        description: 'Detalhes de promoções aplicadas ao pedido',
      },
      {
        name: 'bairro',
        type: 'STRING',
        description: 'Bairro do endereço de entrega',
        isSearchable: true,
      },
      {
        name: 'cidade',
        type: 'STRING',
        description: 'Cidade do endereço de entrega',
        isSearchable: true,
      },
      {
        name: 'uf',
        type: 'STRING',
        description: 'Estado do endereço de entrega',
        isSearchable: true,
      },
      {
        name: 'cep',
        type: 'STRING',
        description: 'CEP do endereço de entrega',
        isSearchable: true,
      },
    ],
    relationships: [
      {
        table: 'PRODUTOS',
        field: 'itensJSON.codigo',
        foreignField: 'ProductRefId',
        type: 'many-to-many',
        description: 'Relacionamento com produtos através do JSON de itens',
      },
      {
        table: 'ASSINATURA',
        field: 'id_order_tiny',
        foreignField: 'id',
        type: 'one-to-one',
        description: 'Relacionamento com assinatura quando o pedido é recorrente',
      },
    ],
    commonQueries: [
      {
        description: 'Total de vendas por período',
        query: `
          SELECT DATE_TRUNC(data_pedido, DAY) as data,
                 COUNT(*) as total_pedidos,
                 SUM(total_pedido_pago) as valor_total
          FROM PEDIDOS
          WHERE data_pedido BETWEEN @start AND @end
          GROUP BY 1
          ORDER BY 1
        `,
      },
      {
        description: 'Produtos mais vendidos',
        query: `
          SELECT p.NameComplete as produto,
                 SUM(i.quantidade) as quantidade_vendida,
                 SUM(i.quantidade * i.valor_unitario) as valor_total
          FROM PEDIDOS o,
               JSON_TABLE(o.itensJSON, '$[*]' COLUMNS(
                 codigo STRING PATH '$.codigo',
                 quantidade INT PATH '$.quantidade',
                 valor_unitario FLOAT PATH '$.valor_unitario'
               )) as i
          JOIN PRODUTOS p ON i.codigo = p.ProductRefId
          WHERE o.data_pedido BETWEEN @start AND @end
          GROUP BY 1
          ORDER BY 2 DESC
          LIMIT 10
        `,
      },
    ],
  },
  {
    name: 'PRODUTOS',
    description: 'Catálogo de produtos disponíveis na plataforma',
    fields: [
      {
        name: 'id',
        type: 'STRING',
        description: 'Identificador único do SKU na VTEX',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'ProductRefId',
        type: 'STRING',
        description: 'Código do produto usado como SKU',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'NameComplete',
        type: 'STRING',
        description: 'Nome completo do produto',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'ProductDescription',
        type: 'STRING',
        description: 'Descrição detalhada do produto',
        isSearchable: true,
      },
      {
        name: 'BrandName',
        type: 'STRING',
        description: 'Nome da marca',
        isSearchable: true,
      },
      {
        name: 'IsActive',
        type: 'BOOLEAN',
        description: 'Indicador se o produto está ativo',
      },
      {
        name: 'preco_custo_medio',
        type: 'NUMERIC',
        description: 'Custo médio do produto para a empresa',
      },
      {
        name: 'saldo_estoque',
        type: 'NUMERIC',
        description: 'Quantidade disponível em estoque',
      },
      {
        name: 'dias_zerado',
        type: 'NUMERIC',
        description: 'Número de dias sem estoque',
      },
      {
        name: 'ProductCategories',
        type: 'ARRAY<STRING>',
        description: 'Categorias às quais o produto pertence',
        isSearchable: true,
      },
    ],
    relationships: [
      {
        table: 'PEDIDOS',
        field: 'ProductRefId',
        foreignField: 'itensJSON.codigo',
        type: 'many-to-many',
        description: 'Relacionamento com pedidos através do JSON de itens',
      },
    ],
  },
  {
    name: 'ASSINATURA',
    description: 'Gerencia produtos em regime de assinatura (recorrentes)',
    fields: [
      {
        name: 'id',
        type: 'STRING',
        description: 'Identificador único da assinatura',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'customerId',
        type: 'STRING',
        description: 'ID do cliente associado',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'customerEmail',
        type: 'STRING',
        description: 'Email do cliente',
        isSearchable: true,
      },
      {
        name: 'status',
        type: 'STRING',
        description: 'Estado atual da assinatura',
        examples: ['active', 'paused', 'canceled'],
        isSearchable: true,
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
    relationships: [
      {
        table: 'PEDIDOS',
        field: 'id',
        foreignField: 'id_order_tiny',
        type: 'one-to-many',
        description: 'Relacionamento com os pedidos gerados pela assinatura',
      },
      {
        table: 'CLIENTES',
        field: 'customerEmail',
        foreignField: 'clientProfileData_email',
        type: 'one-to-many',
        description: 'Relacionamento com o cadastro do cliente',
      },
    ],
  },
  {
    name: 'CLIENTES',
    description: 'Cadastro e informações de clientes da plataforma',
    fields: [
      {
        name: 'clientProfileData_id',
        type: 'STRING',
        description: 'ID único do perfil',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'clientProfileData_email',
        type: 'STRING',
        description: 'Email do cliente',
        isRequired: true,
        isSearchable: true,
      },
      {
        name: 'clientProfileData_firstName',
        type: 'STRING',
        description: 'Nome do cliente',
        isSearchable: true,
      },
      {
        name: 'clientProfileData_lastName',
        type: 'STRING',
        description: 'Sobrenome do cliente',
        isSearchable: true,
      },
      {
        name: 'clientProfileData_document',
        type: 'STRING',
        description: 'CPF ou CNPJ do cliente',
        isSearchable: true,
      },
      {
        name: 'clientProfileData_phone',
        type: 'STRING',
        description: 'Telefone do cliente',
      },
      {
        name: 'status_cliente',
        type: 'STRING',
        description: 'Status no sistema',
        examples: ['Ativo', 'Inativo'],
        isSearchable: true,
      },
      {
        name: 'status_assinante',
        type: 'STRING',
        description: 'Indicador de assinatura',
        isSearchable: true,
      },
    ],
    relationships: [
      {
        table: 'ASSINATURA',
        field: 'clientProfileData_email',
        foreignField: 'customerEmail',
        type: 'one-to-many',
        description: 'Relacionamento com as assinaturas do cliente',
      },
    ],
  },
];
