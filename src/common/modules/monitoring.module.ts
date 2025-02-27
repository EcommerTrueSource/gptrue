import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigMonitoringService } from '../services/config-monitoring.service';
import { PrometheusService } from '../services/prometheus.service';
import { MonitoringController } from '../controllers/monitoring.controller';
import { prometheusConfig, prometheusValidationSchema } from '../../config/prometheus.config';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(() => ({
      prometheus: {
        ...prometheusConfig,
        validationSchema: prometheusValidationSchema
      }
    }))
  ],
  providers: [
    ConfigMonitoringService,
    PrometheusService,
    {
      provide: 'PROMETHEUS_OPTIONS',
      useValue: prometheusConfig
    }
  ],
  exports: [
    ConfigMonitoringService,
    PrometheusService
  ],
  controllers: [MonitoringController]
})
export class MonitoringModule {}
