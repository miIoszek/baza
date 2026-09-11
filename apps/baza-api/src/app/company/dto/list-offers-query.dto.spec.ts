import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListOffersQueryDto } from './list-offers-query.dto';

describe('ListOffersQueryDto', () => {
  it('accepts valid filter query', async () => {
    const dto = plainToInstance(ListOffersQueryDto, {
      countries: 'PL,DE',
      cadence: 'weekly',
      license: 'C_E',
      nearLat: '52.2',
      nearLng: '21.0',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nearLat).toBe(52.2);
    expect(dto.nearLng).toBe(21.0);
  });

  it('rejects invalid license wire code', async () => {
    const dto = plainToInstance(ListOffersQueryDto, { license: 'C+E' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'license')).toBe(true);
  });

  it('rejects invalid cadence', async () => {
    const dto = plainToInstance(ListOffersQueryDto, { cadence: 'yearly' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'cadence')).toBe(true);
  });

  it('maps empty nearLat/nearLng to null instead of 0', async () => {
    const dto = plainToInstance(ListOffersQueryDto, {
      nearLat: '',
      nearLng: '',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nearLat).toBeNull();
    expect(dto.nearLng).toBeNull();
  });

  it('rejects country codes outside the allowlist', async () => {
    const dto = plainToInstance(ListOffersQueryDto, { countries: 'PL,XX' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'countries')).toBe(true);
  });

  it('rejects oversized countries query', async () => {
    const dto = plainToInstance(ListOffersQueryDto, {
      countries: 'PL,'.repeat(80) + 'DE',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'countries')).toBe(true);
  });
});
