import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@baza/shared-types';

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'baza-api',
      timestamp: new Date().toISOString(),
    };
  }
}
