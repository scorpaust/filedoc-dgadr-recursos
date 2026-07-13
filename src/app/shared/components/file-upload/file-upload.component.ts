import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

export type FileUploadKind = 'video' | 'pdf' | 'image';

export interface FileUploadSelection {
  readonly fileName: string;
  readonly sizeBytes: number;
  // URL local (via `URL.createObjectURL`) — válido apenas nesta sessão do browser. Nunca é
  // enviado para nenhum servidor; simula a seleção, não o carregamento real do ficheiro.
  readonly objectUrl: string;
}

const ACCEPT_BY_KIND: Record<FileUploadKind, readonly string[]> = {
  video: ['.mp4', '.webm'],
  pdf: ['.pdf'],
  image: ['.png', '.jpg', '.jpeg', '.webp'],
};

// Valores indicativos desta fase de UI (Fase 8) — a substituir pelos valores reais de
// configuração vindos da API quando o carregamento real for integrado.
const MAX_SIZE_MB_BY_KIND: Record<FileUploadKind, number> = { video: 200, pdf: 20, image: 5 };

@Component({
  selector: 'fdr-file-upload',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fdr-file-upload">
      <span class="fdr-file-upload__label" [id]="labelId()">{{ label() }}</span>

      <div class="fdr-file-upload__control">
        <span class="fdr-file-upload__trigger-wrapper">
          <label class="fdr-file-upload__trigger" [attr.for]="inputId()">
            <fdr-icon name="upload" size="sm" />
            {{ selection() || currentFileName() ? 'Substituir ficheiro' : 'Selecionar ficheiro' }}
          </label>
          <input
            [id]="inputId()"
            type="file"
            class="fdr-file-upload__input"
            [attr.accept]="accept()"
            [attr.aria-describedby]="labelId()"
            (change)="onFileChange($event)"
          />
        </span>

        @if (selection(); as current) {
          <span class="fdr-file-upload__filename">{{ current.fileName }}</span>
          <fdr-button variant="ghost" size="sm" type="button" (clicked)="clear()">
            Remover
          </fdr-button>
        } @else if (currentFileName(); as name) {
          <span class="fdr-file-upload__filename">{{ name }} (atual)</span>
        }
      </div>

      @if (kind() === 'image' && selection(); as imagePreview) {
        <img class="fdr-file-upload__preview" [src]="imagePreview.objectUrl" alt="" />
      }

      @if (error(); as message) {
        <p class="fdr-file-upload__error" role="alert">{{ message }}</p>
      }
    </div>
  `,
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent {
  readonly kind = input.required<FileUploadKind>();
  readonly label = input.required<string>();
  readonly currentFileName = input<string | undefined>(undefined);
  readonly selectionChange = output<FileUploadSelection | undefined>();

  protected readonly error = signal<string | undefined>(undefined);
  protected readonly selection = signal<FileUploadSelection | undefined>(undefined);
  protected readonly accept = computed(() => ACCEPT_BY_KIND[this.kind()].join(','));

  private static nextId = 0;
  private readonly instanceId = FileUploadComponent.nextId++;
  protected readonly inputId = computed(() => `fdr-file-upload-${this.instanceId}`);
  protected readonly labelId = computed(() => `${this.inputId()}-label`);

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    const allowedExtensions = ACCEPT_BY_KIND[this.kind()];
    if (!allowedExtensions.includes(extension)) {
      this.error.set(`Ficheiro inválido. Extensões permitidas: ${allowedExtensions.join(', ')}.`);
      return;
    }

    const maxSizeMb = MAX_SIZE_MB_BY_KIND[this.kind()];
    if (file.size > maxSizeMb * 1024 * 1024) {
      this.error.set(`Ficheiro demasiado grande. Tamanho máximo: ${maxSizeMb} MB.`);
      return;
    }

    this.error.set(undefined);
    const next: FileUploadSelection = {
      fileName: file.name,
      sizeBytes: file.size,
      objectUrl: URL.createObjectURL(file),
    };
    this.selection.set(next);
    this.selectionChange.emit(next);
  }

  protected clear(): void {
    this.selection.set(undefined);
    this.error.set(undefined);
    this.selectionChange.emit(undefined);
  }
}
