import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCompanyProfileDto } from './update-company-profile.dto';

describe('UpdateCompanyProfileDto', () => {
  const valid = {
    name: 'Acme Transport',
    nip: '1234567890',
    description: 'Fleet ops',
    baseLocation: 'Warsaw',
  };

  it('accepts a valid payload', async () => {
    const dto = plainToInstance(UpdateCompanyProfileDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects NIP that is not exactly 10 digits', async () => {
    const dto = plainToInstance(UpdateCompanyProfileDto, {
      ...valid,
      nip: '123456789',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nip')).toBe(true);
  });

  it('rejects description over max length', async () => {
    const dto = plainToInstance(UpdateCompanyProfileDto, {
      ...valid,
      description: 'x'.repeat(2001),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });

  it('rejects name shorter than 2 chars', async () => {
    const dto = plainToInstance(UpdateCompanyProfileDto, {
      ...valid,
      name: 'A',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
