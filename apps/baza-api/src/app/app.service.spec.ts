import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('should return ok health payload', () => {
      const result = service.getHealth();
      expect(result.status).toEqual('ok');
      expect(result.service).toEqual('baza-api');
    });
  });
});
