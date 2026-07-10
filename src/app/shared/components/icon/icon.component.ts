import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'home'
  | 'grid'
  | 'file'
  | 'lightbulb'
  | 'headset'
  | 'clipboard'
  | 'folder'
  | 'shield'
  | 'search'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'close'
  | 'play'
  | 'chevron-down'
  | 'chevron-right'
  | 'check'
  | 'alert-triangle'
  | 'clock'
  | 'download'
  | 'plus'
  | 'arrow-left'
  | 'ban'
  | 'info';

export type IconSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };

@Component({
  selector: 'fdr-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="pixelSize()"
      [attr.height]="pixelSize()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.aria-hidden]="ariaLabel() ? null : 'true'"
      [attr.role]="ariaLabel() ? 'img' : null"
      [attr.aria-label]="ariaLabel() ?? null"
    >
      @switch (name()) {
        @case ('home') {
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        }
        @case ('grid') {
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        }
        @case ('file') {
          <path d="M6 2h9l5 5v15H6z" />
          <path d="M15 2v5h5" />
        }
        @case ('lightbulb') {
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        }
        @case ('headset') {
          <path d="M4 13a8 8 0 0 1 16 0" />
          <rect x="2" y="13" width="4" height="7" rx="1" />
          <rect x="18" y="13" width="4" height="7" rx="1" />
          <path d="M20 20a4 4 0 0 1-4 2h-2" />
        }
        @case ('clipboard') {
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 2h6v4H9z" />
        }
        @case ('folder') {
          <path d="M3 6h6l2 3h10v10H3z" />
        }
        @case ('shield') {
          <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
          />
        }
        @case ('moon') {
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        }
        @case ('menu') {
          <path d="M4 6h16M4 12h16M4 18h16" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('play') {
          <path d="M7 5l12 7-12 7z" />
        }
        @case ('chevron-down') {
          <path d="M6 9l6 6 6-6" />
        }
        @case ('chevron-right') {
          <path d="M9 6l6 6-6 6" />
        }
        @case ('check') {
          <path d="M4 12l6 6L20 6" />
        }
        @case ('alert-triangle') {
          <path d="M12 3l10 18H2z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        }
        @case ('download') {
          <path d="M12 3v12" />
          <path d="M7 11l5 5 5-5" />
          <path d="M4 20h16" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('arrow-left') {
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        }
        @case ('ban') {
          <circle cx="12" cy="12" r="9" />
          <path d="M5.5 5.5l13 13" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01" />
          <path d="M11 12h1v5h1" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
  readonly ariaLabel = input<string | undefined>(undefined);

  protected readonly pixelSize = computed(() => SIZE_PX[this.size()]);
}
