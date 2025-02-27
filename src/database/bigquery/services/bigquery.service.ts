import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';

@Injectable()
export class BigQueryService {
  private readonly bigquery: BigQuery;

  constructor(private readonly configService: ConfigService) {
    this.bigquery = new BigQuery({
      projectId: this.configService.get<string>('BIGQUERY_PROJECT_ID'),
      keyFilename: this.configService.get<string>('BIGQUERY_KEY_FILE'),
    });
  }

  async validateQuery(query: string): Promise<boolean> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        dryRun: true,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async estimateQueryCost(query: string): Promise<number> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        dryRun: true,
      });
      return job.metadata.statistics.totalBytesProcessed || 0;
    } catch (error) {
      throw new Error('Erro ao estimar custo da query');
    }
  }

  async executeQuery(query: string): Promise<any[]> {
    try {
      const [rows] = await this.bigquery.query(query);
      return rows;
    } catch (error) {
      throw new Error('Erro ao executar query');
    }
  }
}
