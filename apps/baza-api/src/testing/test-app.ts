import { DataSource } from 'typeorm';
import { Global, INestApplication, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { configureApp } from '@baza/api-core';
import { AppController } from '../app/app.controller';
import { AppService } from '../app/app.service';
import { AuthModule } from '../app/auth/auth.module';
import { CompanyModule } from '../app/company/company.module';
import { AccessTokenGuard } from '../app/identity/guards/access-token.guard';
import { RolesGuard } from '../app/identity/guards/roles.guard';
import { IdentityModule } from '../app/identity/identity.module';
import { MailerService } from '../app/identity/mail/mailer.service';
import { PASSWORD_PARAMETERS } from '../app/identity/services/password-hasher.service';
import { createTestDb, type TestDb } from './test-db';

export type SentMail = { kind: string; to: string; url: string };

/** Captures outgoing mail instead of sending it, so tests can follow verification/reset links. */
export class FakeMailer {
  readonly sent: SentMail[] = [];
  sendEmailVerification = async (to: string, url: string) => {
    this.sent.push({ kind: 'verify', to, url });
  };
  sendPasswordReset = async (to: string, url: string) => {
    this.sent.push({ kind: 'reset', to, url });
  };
  sendPasswordChangedNotice = async (to: string, url: string) => {
    this.sent.push({ kind: 'changed', to, url });
  };
  sendAccountAlreadyExistsNotice = async (to: string, url: string) => {
    this.sent.push({ kind: 'exists', to, url });
  };
  last(kind: string, to?: string): SentMail | undefined {
    return [...this.sent]
      .reverse()
      .find((m) => m.kind === kind && (!to || m.to === to));
  }
}

export type TestApp = {
  app: INestApplication;
  db: TestDb;
  mailer: FakeMailer;
  origin: string;
  close: () => Promise<void>;
};

export const TEST_ORIGIN = 'http://localhost:4200';

/**
 * The real identity/auth/company modules and the real guards, on a throw-away schema in a real
 * Postgres. The throttler GUARD is intentionally not registered (its per-route limits are not what
 * these tests are about); scrypt cost is lowered so registration/login stay fast.
 */
export async function createTestApp(
  env: Record<string, string> = {}
): Promise<TestApp> {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    AUTH_ALLOWED_ORIGINS: TEST_ORIGIN,
    AUTH_WEB_BASE_URL: TEST_ORIGIN,
    AUTH_SECURE_COOKIES: 'false',
    MAIL_TRANSPORT: 'log',
    ...env,
  });

  const db = await createTestDb();
  const mailer = new FakeMailer();

  @Global()
  @Module({
    providers: [
      { provide: DataSource, useValue: db.dataSource },
      {
        provide: PASSWORD_PARAMETERS,
        useValue: { cost: 1024, blockSize: 8, parallelization: 1, keyLength: 32 },
      },
    ],
    exports: [DataSource, PASSWORD_PARAMETERS],
  })
  class TestDbModule {}

  const moduleRef = await Test.createTestingModule({
    imports: [
      TestDbModule,
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10_000 }]),
      IdentityModule,
      AuthModule,
      CompanyModule,
    ],
    controllers: [AppController],
    providers: [
      AppService,
      { provide: APP_GUARD, useClass: AccessTokenGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  })
    .overrideProvider(MailerService)
    .useValue(mailer)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  app.setGlobalPrefix('api');
  await app.init();

  return {
    app,
    db,
    mailer,
    origin: TEST_ORIGIN,
    close: async () => {
      await app.close();
      await db.destroy();
    },
  };
}
