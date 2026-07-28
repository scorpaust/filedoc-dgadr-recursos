/** Forma devolvida ao cliente — alinhada 1:1 com `Tip` do frontend (`shared/models/tip.model.ts`); `title` (só usado pela gestão editorial, Fase 7) não é exposto por este endpoint de leitura pública. */
export interface TipResponse {
  readonly id: string;
  readonly text: string;
  readonly status: 'draft' | 'published' | 'archived';
  readonly sortOrder: number;
}

/** Forma devolvida ao cliente — alinhada 1:1 com `Faq` do frontend (`shared/models/faq.model.ts`). */
export interface FaqResponse {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category?: string;
  readonly status: 'draft' | 'published' | 'archived';
  readonly sortOrder: number;
}
