import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

/** Shared Nest bootstrap helpers — call from apps/baza-api main.ts. */
export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
