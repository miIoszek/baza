import { describe, expect, it } from 'vitest';
import { fileRejection } from './file-drop';

describe('fileRejection', () => {
  const pdf = (bytes: number) =>
    new File([new Uint8Array(bytes)], 'cv.pdf', { type: 'application/pdf' });

  it('accepts a PDF up to the size limit', () => {
    expect(fileRejection(pdf(5 * 1024 * 1024), 'application/pdf', 5)).toBeNull();
  });

  it('rejects other types before checking the size', () => {
    const docx = new File(['x'], 'cv.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(fileRejection(docx, 'application/pdf', 5)).toBe('type');
  });

  it('rejects a file over the limit', () => {
    expect(fileRejection(pdf(5 * 1024 * 1024 + 1), 'application/pdf', 5)).toBe('size');
  });

  it('accepts any listed type', () => {
    const png = new File(['x'], 'logo.png', { type: 'image/png' });
    expect(fileRejection(png, 'image/jpeg, image/png', 1)).toBeNull();
  });
});
