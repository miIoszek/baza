import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterCompanyDto } from './register-company.dto';

describe('RegisterCompanyDto', () => {
  const valid = {
    name: 'Acme Transport',
    nip: '1234567890',
    email: 'fleet@acme.pl',
    password: 'secret123',
    description: 'Fleet ops',
    baseLocation: 'Warsaw',
    termsAccepted: true,
  };

  it('accepts a valid payload', async () => {
    const dto = plainToInstance(RegisterCompanyDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const dto = plainToInstance(RegisterCompanyDto, {
      ...valid,
      email: 'not-an-email',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects NIP with letters', async () => {
    const dto = plainToInstance(RegisterCompanyDto, {
      ...valid,
      nip: '123456789a',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nip')).toBe(true);
  });

  it('rejects name over max length', async () => {
    const dto = plainToInstance(RegisterCompanyDto, {
      ...valid,
      name: 'x'.repeat(121),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
