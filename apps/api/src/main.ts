import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = [
    'http://localhost:3000',
    'http://localhost:3020',
    'https://credflow.primatasolucoes.com.br',
  ];
  if (process.env.CORS_ORIGIN) {
    corsOrigins.push(...process.env.CORS_ORIGIN.split(',').map((o) => o.trim()));
  }
  app.enableCors({ origin: corsOrigins, credentials: true });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
