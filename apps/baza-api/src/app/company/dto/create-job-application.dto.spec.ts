import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateJobApplicationDto } from './create-job-application.dto';

describe('CreateJobApplicationDto', () => {
  it('accepts valid apply payload with consent true', async () => {
    const dto = plainToInstance(CreateJobApplicationDto, {
      email: 'driver@example.com',
      phone: '+48123123123',
      message: 'Cześć',
      consentAccepted: 'true',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.consentAccepted).toBe(true);
  });

  it('accepts consent as 1', async () => {
    const dto = plainToInstance(CreateJobApplicationDto, {
      email: 'driver@example.com',
      phone: '+48123123123',
      consentAccepted: '1',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects missing consent', async () => {
    const dto = plainToInstance(CreateJobApplicationDto, {
      email: 'driver@example.com',
      phone: '+48123123123',
      consentAccepted: 'false',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'consentAccepted')).toBe(true);
  });

  it('rejects oversized message', async () => {
    const dto = plainToInstance(CreateJobApplicationDto, {
      email: 'driver@example.com',
      phone: '+48123123123',
      message: 'x'.repeat(2001),
      consentAccepted: true,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });
});
