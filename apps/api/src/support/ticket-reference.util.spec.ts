import {
  generateTicketReference,
  generateUniqueTicketReference,
  isValidTicketReferenceFormat,
} from './ticket-reference.util';

describe('ticket-reference.util', () => {
  describe('generateTicketReference', () => {
    it('respeita o formato SUP-AAAA-XXXXXX', () => {
      const reference = generateTicketReference(2026);

      expect(reference).toMatch(/^SUP-2026-[0-9A-Z]{6}$/);
      expect(isValidTicketReferenceFormat(reference)).toBe(true);
    });

    it('nunca inclui carateres ambíguos (I, O, 0, 1)', () => {
      for (let i = 0; i < 200; i += 1) {
        const reference = generateTicketReference(2026);
        const randomPart = reference.slice('SUP-2026-'.length);
        expect(randomPart).not.toMatch(/[IO01]/);
      }
    });

    it('gera partes aleatórias não sequenciais entre chamadas', () => {
      const references = new Set(
        Array.from({ length: 50 }, () => generateTicketReference(2026)),
      );

      // Com 50 gerações independentes sobre um alfabeto de 33 carateres em 6 posições,
      // é praticamente certo obter valores distintos — uma repetição sistemática indicaria
      // uma implementação sequencial/previsível, não aleatória.
      expect(references.size).toBeGreaterThan(45);
    });
  });

  describe('generateUniqueTicketReference', () => {
    it('nunca devolve uma referência já existente no conjunto fornecido', () => {
      const existing = new Set(
        Array.from({ length: 30 }, () => generateTicketReference(2026)),
      );

      const reference = generateUniqueTicketReference(existing, 2026);

      expect(existing.has(reference)).toBe(false);
      expect(isValidTicketReferenceFormat(reference)).toBe(true);
    });
  });

  describe('isValidTicketReferenceFormat', () => {
    it.each(['SUP-2026-AB23CD', 'SUP-2020-234567'])(
      'aceita %s',
      (reference) => {
        expect(isValidTicketReferenceFormat(reference)).toBe(true);
      },
    );

    it.each([
      'sup-2026-ab23cd',
      'SUP-26-AB23CD',
      'SUP-2026-AB23C',
      'SUP-2026-AB23CDE',
      'SUP_2026_AB23CD',
      '',
    ])('rejeita %s', (reference) => {
      expect(isValidTicketReferenceFormat(reference)).toBe(false);
    });
  });
});
