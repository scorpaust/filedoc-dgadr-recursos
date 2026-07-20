// Gera um slug simples a partir de um título (usado apenas como sugestão no formulário
// de recurso — o editor pode sempre ajustá-lo manualmente antes de guardar).
export function slugify(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
