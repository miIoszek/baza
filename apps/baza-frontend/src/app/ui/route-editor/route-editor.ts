import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export type BazaRouteRow = FormGroup<{
  fromCountry: FormControl<string>;
  toCountry: FormControl<string>;
}>;

export interface BazaRouteCountry {
  code: string;
  name: string;
}

/** One "from → to" row of the offer's routes; both countries required. */
export function routeGroup(from = '', to = ''): BazaRouteRow {
  return new FormGroup({
    fromCountry: new FormControl(from, { nonNullable: true, validators: Validators.required }),
    toCountry: new FormControl(to, { nonNullable: true, validators: Validators.required }),
  });
}

/**
 * "Trasy" in the offer form: numbered from → to rows over a FormArray, which it
 * changes in place. An empty array shows why at least one route is needed.
 */
@Component({
  selector: 'baza-route-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './route-editor.html',
  styleUrl: './route-editor.scss',
})
export class BazaRouteEditor implements DoCheck {
  readonly formArray = input.required<FormArray<BazaRouteRow>>();
  readonly countries = input.required<readonly BazaRouteCountry[]>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);
  private readonly cdr = inject(ChangeDetectorRef);

  /**
   * The FormArray is mutable and the page changes it too (loading an offer,
   * marking everything touched on submit), so check this view with the page's.
   */
  ngDoCheck(): void {
    this.cdr.markForCheck();
  }

  protected add(): void {
    const routes = this.formArray();
    routes.push(routeGroup());
    this.focusAfterRender(`[data-route-from="${routes.length - 1}"]`);
  }

  protected remove(index: number): void {
    const routes = this.formArray();
    routes.removeAt(index);
    routes.markAsTouched();
    // The pressed button is gone: move focus to the row that took its place, else to "Dodaj trasę".
    const next = Math.min(index, routes.length - 1);
    this.focusAfterRender(
      next >= 0 ? `[data-route-remove="${next}"]` : '.baza-route-editor__add'
    );
  }

  private focusAfterRender(selector: string): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(),
      { injector: this.injector }
    );
  }
}
