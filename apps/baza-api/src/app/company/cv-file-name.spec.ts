import { sanitizeCvFileName } from './cv-file-name';

describe('sanitizeCvFileName', () => {
  it('keeps a normal name, including Polish characters', () => {
    expect(sanitizeCvFileName('CV Łukasz Żółć.pdf')).toBe('CV Łukasz Żółć.pdf');
  });

  it('drops directories from both path styles', () => {
    expect(sanitizeCvFileName('C:\\Users\\jan\\cv.pdf')).toBe('cv.pdf');
    expect(sanitizeCvFileName('/home/jan/cv.pdf')).toBe('cv.pdf');
  });

  it('removes control characters and collapses whitespace', () => {
    expect(sanitizeCvFileName('  moje\u0000  cv\u0007.pdf ')).toBe('moje cv.pdf');
    expect(sanitizeCvFileName('moje\t\tcv\n2026.pdf')).toBe('moje cv 2026.pdf');
  });

  it('returns null when nothing usable is left', () => {
    expect(sanitizeCvFileName(undefined)).toBeNull();
    expect(sanitizeCvFileName('')).toBeNull();
    expect(sanitizeCvFileName('   ')).toBeNull();
    expect(sanitizeCvFileName('dir/..')).toBeNull();
  });

  it('caps the length at 255 and keeps the extension', () => {
    const name = sanitizeCvFileName(`${'a'.repeat(400)}.pdf`);
    expect(name).toHaveLength(255);
    expect(name?.endsWith('.pdf')).toBe(true);
  });
});
