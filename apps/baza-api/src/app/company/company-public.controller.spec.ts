import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyPublicController } from './company-public.controller';
import { CompanyPublicService } from './company-public.service';

describe('CompanyPublicController', () => {
  let controller: CompanyPublicController;
  const getById = jest.fn();

  beforeEach(async () => {
    getById.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyPublicController],
      providers: [
        {
          provide: CompanyPublicService,
          useValue: { getById },
        },
      ],
    }).compile();

    controller = module.get(CompanyPublicController);
  });

  it('returns public profile shape for existing company', async () => {
    getById.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Acme Transport',
      nip: '1234567890',
      description: 'Fleet ops',
      baseLocation: 'Warsaw',
      photoUrls: { s192: 'https://cdn.example/logo-192.webp' },
    });

    const result = await controller.getById(
      '11111111-1111-4111-8111-111111111111'
    );

    expect(getById).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111'
    );
    expect(result).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Acme Transport',
      nip: '1234567890',
      description: 'Fleet ops',
      baseLocation: 'Warsaw',
      photoUrls: { s192: 'https://cdn.example/logo-192.webp' },
    });
  });

  it('propagates not found from service', async () => {
    getById.mockRejectedValue(new NotFoundException('Company not found'));

    await expect(
      controller.getById('22222222-2222-4222-8222-222222222222')
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
