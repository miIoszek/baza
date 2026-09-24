import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BazaApplicationForm, type BazaApplicationSubmit } from './application-form';

describe('BazaApplicationForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BazaApplicationForm, NoopAnimationsModule],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(BazaApplicationForm);
    const form = fixture.componentInstance;
    const emitted: BazaApplicationSubmit[] = [];
    form.submitted.subscribe((v) => emitted.push(v));
    fixture.detectChanges();
    return { fixture, form, emitted };
  }

  const pdf = () => new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' });

  it('does not submit without consent and CV, and shows both errors', () => {
    const { fixture, form, emitted } = setup();
    form['form'].patchValue({ email: 'a@b.pl', phone: '123456789' });
    form['submit']();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dodaj CV w formacie PDF, nie większe niż 5 MB.');
    expect(text).toContain('Bez tej zgody nie możemy przekazać aplikacji firmie.');
  });

  it('emits trimmed values and the chosen CV', () => {
    const { form, emitted } = setup();
    const cv = pdf();
    form['onCvSelected'](cv);
    form['form'].patchValue({
      email: ' a@b.pl ',
      phone: ' 123456789 ',
      message: '   ',
      consentAccepted: true,
    });
    form['submit']();

    expect(emitted).toEqual([{ email: 'a@b.pl', phone: '123456789', cv }]);
  });

  it('replaces the form with the confirmation once sent', () => {
    const { fixture } = setup();
    fixture.componentRef.setInput('state', 'sent');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toContain('Aplikacja wysłana');
  });

  it('shows the amber duplicate banner and keeps the entered data', () => {
    const { fixture, form } = setup();
    form['form'].patchValue({ email: 'a@b.pl' });
    fixture.componentRef.setInput('state', 'error-duplicate');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('baza-banner.baza-banner--warn')?.textContent).toContain(
      'Już aplikowałeś na tę ofertę'
    );
    expect(form['form'].controls.email.value).toBe('a@b.pl');
  });
});
