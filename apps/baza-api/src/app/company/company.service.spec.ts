import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { CompanyService } from './company.service';

describe('CompanyService', () => {
  let service: CompanyService;
  const getCompanyForUser = jest.fn();
  const uploadCompanyLogo = jest.fn();
  const deletePrefix = jest.fn();
  const maybeSingle = jest.fn();
  const updateEq = jest.fn();
  const from = jest.fn();

  beforeEach(async () => {
    getCompanyForUser.mockReset();
    uploadCompanyLogo.mockReset();
    deletePrefix.mockReset();
    maybeSingle.mockReset();
    updateEq.mockReset();
    from.mockReset();

    from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
      update: () => ({
        eq: updateEq,
      }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: SupabaseAuthService,
          useValue: { getClient: () => ({ from }) },
        },
        {
          provide: R2StorageService,
          useValue: {
            isConfigured: () => true,
            uploadCompanyLogo,
            deletePrefix,
          },
        },
        {
          provide: AuthService,
          useValue: { getCompanyForUser },
        },
      ],
    }).compile();

    service = module.get(CompanyService);
  });

  const dto = {
    name: 'Acme',
    nip: '1234567890',
    description: 'Fleet',
    baseLocation: 'Warsaw',
  };

  it('updates profile fields without photo', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: 'c1', photo_key: null },
      error: null,
    });
    updateEq.mockResolvedValue({ error: null });
    getCompanyForUser.mockResolvedValue({
      id: 'c1',
      ...dto,
      photoUrls: null,
    });

    const result = await service.updateProfile('user-1', dto);

    expect(uploadCompanyLogo).not.toHaveBeenCalled();
    expect(deletePrefix).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'c1', ...dto, photoUrls: null });
  });

  it('uploads new logo, persists urls, and deletes previous photo_key', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: 'c1', photo_key: 'companies/user-1/logo' },
      error: null,
    });
    updateEq.mockResolvedValue({ error: null });
    uploadCompanyLogo.mockResolvedValue({
      photoKey: 'companies/user-1/logos/new-id',
      photoUrls: {
        original: 'https://cdn.example/new.jpg',
        s48: 'https://cdn.example/n48.webp',
        s96: 'https://cdn.example/n96.webp',
        s192: 'https://cdn.example/n192.webp',
        s512: 'https://cdn.example/n512.webp',
      },
    });
    getCompanyForUser.mockResolvedValue({
      id: 'c1',
      ...dto,
      photoUrls: { s96: 'https://cdn.example/n96.webp' },
    });

    const photo = {
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await service.updateProfile('user-1', dto, photo);

    expect(uploadCompanyLogo).toHaveBeenCalledWith(
      'user-1',
      photo.buffer,
      'image/jpeg'
    );
    expect(deletePrefix).toHaveBeenCalledWith('companies/user-1/logo');
  });

  it('throws NotFoundException when company row is missing', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(service.updateProfile('user-1', dto)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('deletes newly uploaded prefix when DB update fails', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: 'c1', photo_key: null },
      error: null,
    });
    updateEq.mockResolvedValue({ error: { message: 'db fail' } });
    uploadCompanyLogo.mockResolvedValue({
      photoKey: 'companies/user-1/logos/new-id',
      photoUrls: {
        original: 'https://cdn.example/new.jpg',
        s48: '',
        s96: '',
        s192: '',
        s512: '',
      },
    });

    const photo = {
      buffer: Buffer.from('img'),
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(
      service.updateProfile('user-1', dto, photo)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(deletePrefix).toHaveBeenCalledWith(
      'companies/user-1/logos/new-id'
    );
  });
});
