import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getHealth', () => {
    it('should return ok health payload', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.getHealth();
      expect(result.status).toEqual('ok');
      expect(result.service).toEqual('baza-api');
      expect(result.timestamp).toBeDefined();
    });
  });
});
