import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AppConfig {
  port: number;
  environment: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimiting: {
    points: number;
    duration: number;
  };
}

export const appConfigValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  RATE_LIMIT_POINTS: Joi.number().default(100),
  RATE_LIMIT_DURATION: Joi.number().default(60),
});

export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  rateLimiting: {
    points: parseInt(process.env.RATE_LIMIT_POINTS, 10) || 100,
    duration: parseInt(process.env.RATE_LIMIT_DURATION, 10) || 60,
  },
})); 