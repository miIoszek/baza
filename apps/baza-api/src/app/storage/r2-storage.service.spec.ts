import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';

describe('R2StorageService private CV', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function withPrivateEnv() {
    process.env['R2_ACCOUNT_ID'] = 'acct';
    process.env['R2_ACCESS_KEY_ID'] = 'key';
    process.env['R2_SECRET_ACCESS_KEY'] = 'secret';
    process.env['R2_PRIVATE_BUCKET'] = 'baza-private';
    delete process.env['R2_PUBLIC_URL'];
  }

  it('isPrivateConfigured without R2_PUBLIC_URL', () => {
    withPrivateEnv();
    const svc = new R2StorageService();
    expect(svc.isPrivateConfigured()).toBe(true);
    expect(svc.isConfigured()).toBe(false);
  });

  it('rejects non-PDF mime for CV', async () => {
    withPrivateEnv();
    const svc = new R2StorageService();
    await expect(
      svc.uploadApplicationCv(
        'c1',
        'o1',
        Buffer.from('%PDF-1.4'),
        'application/msword'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects buffer that is not a PDF magic header', async () => {
    withPrivateEnv();
    const svc = new R2StorageService();
    await expect(
      svc.uploadApplicationCv(
        'c1',
        'o1',
        Buffer.from('not-a-pdf'),
        'application/pdf'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when private bucket missing', async () => {
    process.env['R2_ACCOUNT_ID'] = 'acct';
    process.env['R2_ACCESS_KEY_ID'] = 'key';
    process.env['R2_SECRET_ACCESS_KEY'] = 'secret';
    delete process.env['R2_PRIVATE_BUCKET'];
    const svc = new R2StorageService();
    expect(svc.isPrivateConfigured()).toBe(false);
    await expect(
      svc.uploadApplicationCv(
        'c1',
        'o1',
        Buffer.from('%PDF-1.4'),
        'application/pdf'
      )
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('is not private-configured when private bucket equals public bucket', () => {
    withPrivateEnv();
    process.env['R2_BUCKET'] = 'baza-uploads';
    process.env['R2_PRIVATE_BUCKET'] = 'baza-uploads';
    const svc = new R2StorageService();
    expect(svc.isPrivateConfigured()).toBe(false);
  });
});
