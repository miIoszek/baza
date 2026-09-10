import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateJobOfferDto } from './job-offer.dto';

describe('CreateJobOfferDto', () => {
  const valid = {
    title: 'Kierowca',
    description: 'Opis oferty',
    homeReturnCadence: 'weekly',
    requiredYearsExperience: 1,
    requiredTransportType: 'car_transporter',
    routes: [
      {
        from: { code: 'PL', name: 'Polska' },
        to: { code: 'DE', name: 'Niemcy' },
      },
    ],
  };

  it('accepts curated transport and country codes', async () => {
    const dto = plainToInstance(CreateJobOfferDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects unknown country code', async () => {
    const dto = plainToInstance(CreateJobOfferDto, {
      ...valid,
      routes: [
        {
          from: { code: 'XX', name: 'X' },
          to: { code: 'DE', name: 'Niemcy' },
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown transport type', async () => {
    const dto = plainToInstance(CreateJobOfferDto, {
      ...valid,
      requiredTransportType: 'spaceship',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'requiredTransportType')).toBe(
      true
    );
  });
});
