import { Test, TestingModule } from '@nestjs/testing';
import { OffersPublicController } from './offers-public.controller';
import { JobApplicationService } from './job-application.service';
import { JobOfferService } from './job-offer.service';

describe('OffersPublicController', () => {
  let controller: OffersPublicController;
  const listPublishedRouteCountries = jest.fn();

  beforeEach(async () => {
    listPublishedRouteCountries.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffersPublicController],
      providers: [
        {
          provide: JobOfferService,
          useValue: {
            parseListQuery: jest.fn(),
            listPublished: jest.fn(),
            listPublishedRouteCountries,
            getPublishedById: jest.fn(),
          },
        },
        {
          provide: JobApplicationService,
          useValue: { applyToPublishedOffer: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get(OffersPublicController);
  });

  it('listCountries returns distinct countries from published offers', async () => {
    const countries = [{ code: 'PL', namePl: 'Polska' }];
    listPublishedRouteCountries.mockResolvedValue(countries);
    await expect(controller.listCountries()).resolves.toEqual(countries);
    expect(listPublishedRouteCountries).toHaveBeenCalledTimes(1);
  });
});
