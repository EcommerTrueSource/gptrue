import { RecordMetadataValue } from '@pinecone-database/pinecone';

export interface PineconeMetadata {
  question: string;
  response: string;
  query: string;
  executionTimeMs: number;
  sourceTables: string[];
  createdAt: string;
  updatedAt: string;
  version: string;
  feedbackPositive: number;
  feedbackNegative: number;
  feedbackComments: string[];
  needsReview: boolean;
  [key: string]: RecordMetadataValue;
}
