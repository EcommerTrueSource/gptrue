import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PineconeService } from '../../database/pinecone/pinecone.service';

@Module({
  imports: [ConfigModule],
  providers: [PineconeService],
  exports: [PineconeService],
})
export class PineconeModule {} 