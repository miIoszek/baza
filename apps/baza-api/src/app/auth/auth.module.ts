import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseAuthService } from './supabase-auth.service';

@Module({
  imports: [StorageModule],
  controllers: [AuthController],
  providers: [SupabaseAuthService, JwtAuthGuard, AuthService],
  exports: [SupabaseAuthService, JwtAuthGuard, AuthService],
})
export class AuthModule {}
