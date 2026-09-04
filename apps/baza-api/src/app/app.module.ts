import { Module } from '@nestjs/common';
import { ApiCoreModule } from '@baza/api-core';
import { ApiDataAccessModule } from '@baza/api-data-access';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ApiCoreModule, ApiDataAccessModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
