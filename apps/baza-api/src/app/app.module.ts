import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { ApiCoreModule } from '@baza/api-core';
import { ApiDataAccessModule } from '@baza/api-data-access';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { GeoModule } from './geo/geo.module';
import { AccessTokenGuard } from './identity/guards/access-token.guard';
import { RolesGuard } from './identity/guards/roles.guard';
import { IdentityModule } from './identity/identity.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ApiCoreModule,
    ApiDataAccessModule,
    IdentityModule,
    AuthModule,
    CompanyModule,
    GeoModule,
    // High default so browse is unaffected; register/login/apply set stricter @Throttle.
    // In-memory and per-process: fine for the single Railway replica, needs Redis when scaled out.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: throttle first (cheap, no DB), then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
