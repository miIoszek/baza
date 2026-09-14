jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('../storage/r2-storage.service', () => ({
  R2StorageService: class R2StorageService {},
}));

import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { R2StorageService } from '../storage/r2-storage.service';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { SupabaseAuthService } from './supabase-auth.service';

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

describe('AuthService.register compensation', () => {
  let service: AuthService;
  let r2: {
    isConfigured: jest.Mock;
    uploadCompanyLogo: jest.Mock;
    deletePrefix: jest.Mock;
  };
  let deleteUser: jest.Mock;
  let createUser: jest.Mock;
  let insertSingle: jest.Mock;
  let loggerWarn: jest.SpyInstance;
  let signUp: jest.Mock;

  const envKeys = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;

  const savedEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> =
    {};

  const baseDto: RegisterCompanyDto = {
    name: 'Acme Transport',
    nip: '1234567890',
    email: 'owner@acme.test',
    password: 'password123',
    description: 'Fleet ops',
    baseLocation: 'Warsaw',
    termsAccepted: true,
  };

  function setCompleteEnv() {
    process.env['SUPABASE_URL'] = 'https://example.supabase.co';
    process.env['SUPABASE_ANON_KEY'] = 'anon-key';
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-role-key';
  }

  function mockAdminClient(opts: {
    createUserResult?: {
      data: { user: { id: string } | null };
      error: null | { message: string };
    };
    insertResult?: {
      data: { id: string } | null;
      error: null | { message: string };
    };
    updateResult?: { error: null | { message: string } };
    deleteUserResult?: { data: null; error: null | { message: string } };
  } = {}) {
    createUser = jest.fn().mockResolvedValue(
      opts.createUserResult ?? {
        data: { user: { id: 'user-1' } },
        error: null,
      }
    );
    deleteUser = jest.fn().mockResolvedValue(
      opts.deleteUserResult ?? { data: null, error: null }
    );
    insertSingle = jest.fn().mockResolvedValue(
      opts.insertResult ?? {
        data: null,
        error: { message: 'insert failed' },
      }
    );
    const updateEq = jest.fn().mockResolvedValue(
      opts.updateResult ?? { error: null }
    );
    signUp = jest.fn();

    const from = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: insertSingle,
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: updateEq,
      }),
    });

    const client = {
      auth: {
        admin: {
          createUser,
          deleteUser,
        },
        signUp,
      },
      from,
    };

    createClientMock.mockReturnValue(client as never);
    return client;
  }

  beforeEach(async () => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
    }
    setCompleteEnv();

    r2 = {
      isConfigured: jest.fn().mockReturnValue(true),
      uploadCompanyLogo: jest.fn().mockResolvedValue({
        photoKey: 'companies/c1/logos/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        photoUrls: {
          original: 'https://cdn.example/logo.jpg',
          s48: 'https://cdn.example/logo-48.jpg',
          s96: 'https://cdn.example/logo-96.jpg',
          s192: 'https://cdn.example/logo-192.jpg',
          s512: 'https://cdn.example/logo-512.jpg',
        },
      }),
      deletePrefix: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseAuthService, useValue: { getClient: jest.fn() } },
        { provide: R2StorageService, useValue: r2 },
      ],
    }).compile();

    service = module.get(AuthService);
    loggerWarn = jest
      .spyOn(
        (service as unknown as { logger: Logger }).logger,
        'warn'
      )
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const key of envKeys) {
      const prev = savedEnv[key];
      if (prev === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev;
      }
    }
    jest.restoreAllMocks();
    createClientMock.mockReset();
  });

  it('throws when service role is missing and never creates an auth user', async () => {
    delete process.env['SUPABASE_SERVICE_ROLE_KEY'];
    mockAdminClient();

    await expect(service.register(baseDto)).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );

    expect(createClientMock).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('on company insert failure, deletes the created auth user (no photo)', async () => {
    mockAdminClient();

    await expect(service.register(baseDto)).rejects.toBeInstanceOf(
      BadRequestException
    );

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: baseDto.email,
        password: baseDto.password,
        email_confirm: true,
      })
    );
    expect(deleteUser).toHaveBeenCalledWith('user-1');
    expect(r2.deletePrefix).not.toHaveBeenCalled();
    expect(createClientMock.mock.calls[0]?.[1]).toBe('service-role-key');
  });

  it('on failure after photo upload, deletes R2 prefix and auth user', async () => {
    mockAdminClient({
      insertResult: { data: { id: 'c1' }, error: null },
      updateResult: { error: { message: 'photo update failed' } },
    });

    const photo = {
      fieldname: 'photo',
      originalname: 'logo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 10,
      buffer: Buffer.from('fake-image'),
      destination: '',
      filename: '',
      path: '',
      stream: null as never,
    } as Express.Multer.File;

    await expect(service.register(baseDto, photo)).rejects.toBeInstanceOf(
      BadRequestException
    );

    expect(r2.uploadCompanyLogo).toHaveBeenCalledWith(
      'c1',
      photo.buffer,
      'image/jpeg'
    );
    expect(r2.deletePrefix).toHaveBeenCalledWith(
      'companies/c1/logos/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    );
    expect(deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('logs compensation failure when deleteUser returns { error }', async () => {
    mockAdminClient({
      deleteUserResult: {
        data: null,
        error: { message: 'user not found' },
      },
    });

    await expect(service.register(baseDto)).rejects.toBeInstanceOf(
      BadRequestException
    );

    expect(deleteUser).toHaveBeenCalledWith('user-1');
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Compensation orphan cleanup failed for auth user user-1: user not found'
      )
    );
  });

  it('uses admin createUser only — never anon signUp — when service role is present', async () => {
    mockAdminClient({
      insertResult: {
        data: { id: 'company-1' },
        error: null,
      },
    });

    const result = await service.register(baseDto);

    expect(result).toEqual({ userId: 'user-1', companyId: 'company-1' });
    expect(signUp).not.toHaveBeenCalled();
    expect(createUser).toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe('AuthService.getCompanyForUser', () => {
  let service: AuthService;
  let getClient: jest.Mock;
  let maybeSingle: jest.Mock;

  beforeEach(async () => {
    maybeSingle = jest.fn();
    getClient = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseAuthService, useValue: { getClient } },
        {
          provide: R2StorageService,
          useValue: {
            isConfigured: jest.fn(),
            uploadCompanyLogo: jest.fn(),
            deletePrefix: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('returns null when no company row exists (not an error)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(service.getCompanyForUser('user-1')).resolves.toBeNull();
  });

  it('propagates DB failure instead of returning null (swallowed-error guard)', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection reset' },
    });

    await expect(service.getCompanyForUser('user-1')).rejects.toBeInstanceOf(
      InternalServerErrorException
    );
  });

  it('maps a company row when the query succeeds', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 'c1',
        name: 'Acme',
        nip: '1234567890',
        description: 'Fleet',
        base_location: 'Warsaw',
        base_lat: 52.2,
        base_lng: 21.0,
        photo_urls: null,
      },
      error: null,
    });

    await expect(service.getCompanyForUser('user-1')).resolves.toEqual({
      id: 'c1',
      name: 'Acme',
      nip: '1234567890',
      description: 'Fleet',
      baseLocation: 'Warsaw',
      baseLat: 52.2,
      baseLng: 21.0,
      photoUrls: null,
    });
  });
});
