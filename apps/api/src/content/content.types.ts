/** Forma devolvida ao cliente — alinhada 1:1 com `Tip` do frontend (`shared/models/tip.model.ts`); `title` nunca é exposto (Fase 7 — Integração: derivado automaticamente de `content` no servidor, a UI de gestão de conteúdos nunca o recolhe nem o mostra). */
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
