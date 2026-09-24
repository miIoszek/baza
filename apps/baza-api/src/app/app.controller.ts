import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@baza/shared-types';
import { AppService } from './app.service';
import { Public } from './identity/decorators';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
