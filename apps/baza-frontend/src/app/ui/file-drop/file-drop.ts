import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';

export type BazaFileRejection = 'type' | 'size';

/** Why a file cannot be taken; `accept` is a comma list of MIME types. */
export function fileRejection(
  file: File,
  accept: string,
  maxSizeMb: number
): BazaFileRejection | null {
  const types = accept
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (types.length > 0 && !types.includes(file.type)) {
    return 'type';
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return 'size';
  }
  return null;
}

let nextId = 0;

/**
 * File picker with drag & drop. A real (visually hidden) file input inside a
 * label, so it works with keyboard and screen readers; type and size are checked
 * before anything is sent. The parent owns the chosen File.
 */
@Component({
  selector: 'baza-file-drop',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './file-drop.html',
  styleUrl: './file-drop.scss',
})
export class BazaFileDrop {
  readonly label = input.required<string>();
  readonly accept = input('application/pdf');
  readonly maxSizeMb = input(5);
  /** Name of the file the parent holds; null shows the empty prompt. */
  readonly fileName = input<string | null>(null);
  readonly invalid = input(false);
  /** Id of the error text below, for aria-describedby. */
  readonly errorId = input<string | null>(null);
  readonly selected = output<File>();
  readonly rejected = output<BazaFileRejection>();

  protected readonly inputId = `baza-file-drop-${nextId++}`;
  protected readonly dragging = signal(false);

  protected onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.take(input.files?.[0] ?? null);
    // Lets the same file be picked again after a rejection.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.take(event.dataTransfer?.files?.[0] ?? null);
  }

  private take(file: File | null): void {
    if (!file) {
      return;
    }
    const reason = fileRejection(file, this.accept(), this.maxSizeMb());
    if (reason) {
      this.rejected.emit(reason);
      return;
    }
    this.selected.emit(file);
  }
}
