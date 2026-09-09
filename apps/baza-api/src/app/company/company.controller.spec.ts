import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

describe('CompanyController', () => {
  let controller: CompanyController;
  const getCompanyForUser = jest.fn();
  const updateProfile = jest.fn();

  beforeEach(async () => {
    getCompanyForUser.mockReset();
    updateProfile.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: AuthService,
          useValue: { getCompanyForUser },
        },
        {
          provide: CompanyService,
          useValue: { updateProfile },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(CompanyController);
  });

  it('session returns AuthMeResponse shape for authenticated user', async () => {
    getCompanyForUser.mockResolvedValue({
      id: 'company-1',
      name: 'Acme Transport',
      nip: '1234567890',
      description: 'Desc',
      baseLocation: 'Warsaw',
      photoUrls: null,
    });

    const result = await controller.session({
      user: { id: 'user-1', email: 'fleet@acme.pl' },
    } as AuthedRequest);

    expect(getCompanyForUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      user: { id: 'user-1', email: 'fleet@acme.pl' },
      company: {
        id: 'company-1',
        name: 'Acme Transport',
        nip: '1234567890',
        description: 'Desc',
        baseLocation: 'Warsaw',
        photoUrls: null,
      },
    });
  });

  it('session returns empty user when guard did not attach user', async () => {
    const result = await controller.session({} as AuthedRequest);

    expect(getCompanyForUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      user: { id: '', email: null },
      company: null,
    });
  });

  it('updateProfile delegates to CompanyService for authenticated user', async () => {
    const company = {
      id: 'company-1',
      name: 'Acme Updated',
      nip: '1234567890',
      description: 'New desc',
      baseLocation: 'Krakow',
      photoUrls: null,
    };
    updateProfile.mockResolvedValue(company);

    const dto = {
      name: 'Acme Updated',
      nip: '1234567890',
      description: 'New desc',
      baseLocation: 'Krakow',
    };

    const result = await controller.updateProfile(
      { user: { id: 'user-1', email: 'fleet@acme.pl' } } as AuthedRequest,
      dto
    );

    expect(updateProfile).toHaveBeenCalledWith('user-1', dto, undefined);
    expect(result).toEqual(company);
  });
});
