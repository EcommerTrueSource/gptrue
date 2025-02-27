import { Controller, Get } from '@nestjs/common';
import { PrometheusService } from '../services/prometheus.service';
import { ConfigMonitoringService } from '../services/config-monitoring.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Monitoramento')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly configMonitoringService: ConfigMonitoringService
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Obter métricas do Prometheus' })
  @ApiResponse({
    status: 200,
    description: 'Métricas do Prometheus em formato texto',
    type: String
  })
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificar saúde do serviço' })
  @ApiResponse({
    status: 200,
    description: 'Status de saúde do serviço',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'healthy'
        },
        timestamp: {
          type: 'string',
          format: 'date-time'
        }
      }
    }
  })
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Obter relatório de uso atual' })
  @ApiResponse({
    status: 200,
    description: 'Relatório de uso do sistema',
    schema: {
      type: 'object',
      properties: {
        timestamp: {
          type: 'string',
          format: 'date-time'
        },
        memory: {
          type: 'object',
          properties: {
            heapTotal: { type: 'string' },
            heapUsed: { type: 'string' },
            rss: { type: 'string' },
            external: { type: 'string' }
          }
        },
        uptime: { type: 'number' },
        environment: { type: 'string' }
      }
    }
  })
  async getUsage() {
    return this.configMonitoringService.generateUsageReport();
  }
}
