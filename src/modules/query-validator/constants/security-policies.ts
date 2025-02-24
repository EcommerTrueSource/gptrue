import { SecurityPolicy } from '../interfaces/query-validator.interface';

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  allowedOperations: ['SELECT'],
  maxBytesProcessed: 1000000000, // 1GB
  maxRows: 10000,
  allowedTables: [
    'PEDIDOS',
    'PRODUTOS',
    'ASSINATURA',
    'CLIENTES',
    'STATUS_CLIENTES',
    'STATUS_ASSINANTES',
  ],
  restrictedColumns: [
    {
      table: 'CLIENTES',
      columns: [
        'clientProfileData_document',
        'clientProfileData_phone',
      ],
    },
    {
      table: 'PEDIDOS',
      columns: [
        'cuponsJSON',
        'promocoesJSON',
      ],
    },
  ],
}; 