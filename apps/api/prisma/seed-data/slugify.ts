const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;

/** Normaliza um rótulo em português (com acentos) para um `slug` estável em kebab-case. */
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(COMBINING_DIACRITICAL_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
