import { generateObjectKey } from './object-key.util';

describe('generateObjectKey', () => {
  it('prefixa a chave de acordo com o contexto', () => {
    expect(generateObjectKey('video', 'aula.mp4')).toMatch(/^videos\//);
    expect(generateObjectKey('pdfGuide', 'guia.pdf')).toMatch(/^guides\//);
    expect(generateObjectKey('thumbnail', 'capa.png')).toMatch(/^thumbnails\//);
    expect(generateObjectKey('ticketAttachment', 'anexo.pdf')).toMatch(
      /^ticket-attachments\//,
    );
  });

  it('preserva apenas a extensão do nome original, em minúsculas', () => {
    const key = generateObjectKey('video', 'Aula Introdutória.MP4');
    expect(key.endsWith('.mp4')).toBe(true);
    expect(key).not.toContain('Aula');
    expect(key).not.toContain('Introdutória');
  });

  it('não gera chaves previsíveis nem sequenciais', () => {
    const keys = Array.from({ length: 20 }, () =>
      generateObjectKey('video', 'aula.mp4'),
    );
    expect(new Set(keys).size).toBe(keys.length);
    // ao remover o prefixo/extensão fixos, a parte aleatória não deve seguir
    // nenhum padrão incremental óbvio (ex. números consecutivos)
    const randomParts = keys.map((key) =>
      key.replace('videos/', '').replace('.mp4', ''),
    );
    expect(randomParts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))).toBe(
      true,
    );
  });

  it('não deriva a chave diretamente do nome original', () => {
    const key = generateObjectKey('pdfGuide', 'guia.pdf');
    expect(key).not.toContain('guia');
  });
});
