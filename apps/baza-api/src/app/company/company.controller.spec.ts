import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { JobApplicationService } from './job-application.service';
import { JobOfferService } from './job-offer.service';

describe('CompanyController', () => {
  let controller: CompanyController;
  const getCompanyForUser = jest.fn();
  const updateProfile = jest.fn();
  const listForOwner = jest.fn();
  const getCvStreamForOwner = jest.fn();

  beforeEach(async () => {
    getCompanyForUser.mockReset();
    updateProfile.mockReset();
    listForOwner.mockReset();
    getCvStreamForOwner.mockReset();

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
        {
          provide: JobOfferService,
          useValue: {
            listForOwner: jest.fn(),
            createForUser: jest.fn(),
            updateForUser: jest.fn(),
            unpublishForUser: jest.fn(),
          },
        },
        {
          provide: JobApplicationService,
          useValue: {
            listForOwner,
            getCvStreamForOwner,
          },
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

  it('updateProfile throws when request has no authenticated user', async () => {
    await expect(
      controller.updateProfile({} as AuthedRequest, {
        name: 'Acme',
        nip: '1234567890',
        description: 'd',
        baseLocation: 'Warsaw',
      })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('listApplications delegates to JobApplicationService', async () => {
    listForOwner.mockResolvedValue([
      {
        id: 'app-1',
        jobOfferId: 'offer-1',
        jobOfferTitle: 'IT',
        email: 'a@example.com',
        phone: '123456789',
        createdAt: '2026-09-13T00:00:00Z',
      },
    ]);

    const result = await controller.listApplications({
      user: { id: 'user-1', email: 'fleet@acme.pl' },
    } as AuthedRequest);

    expect(listForOwner).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('app-1');
  });

  it('downloadApplicationCv returns StreamableFile for owned app', async () => {
    const { Readable } = await import('stream');
    const body = Readable.from([Buffer.from('%PDF-1.4')]);
    getCvStreamForOwner.mockResolvedValue({
      body,
      contentType: 'application/pdf',
      contentLength: 8,
    });

    const result = await controller.downloadApplicationCv(
      { user: { id: 'user-1', email: 'fleet@acme.pl' } } as AuthedRequest,
      '11111111-1111-1111-1111-111111111111'
    );

    expect(getCvStreamForOwner).toHaveBeenCalledWith(
      'user-1',
      '11111111-1111-1111-1111-111111111111'
    );
    expect(result.getStream()).toBe(body);
  });
});
