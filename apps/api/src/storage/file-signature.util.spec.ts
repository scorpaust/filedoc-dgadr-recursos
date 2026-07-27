import { matchesDeclaredMimeType } from './file-signature.util';

const PDF_HEADER = Buffer.from('%PDF-1.7\n%âãÏÓ\n', 'latin1');
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const MP4_HEADER = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
]);
const EXE_HEADER = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // "MZ", executável Windows

describe('matchesDeclaredMimeType', () => {
  it('confirma um PDF real declarado como application/pdf', () => {
    expect(matchesDeclaredMimeType(PDF_HEADER, 'application/pdf')).toBe(true);
  });

  it('confirma um PNG real declarado como image/png', () => {
    expect(matchesDeclaredMimeType(PNG_HEADER, 'image/png')).toBe(true);
  });

  it('confirma um JPEG real declarado como image/jpeg', () => {
    expect(matchesDeclaredMimeType(JPEG_HEADER, 'image/jpeg')).toBe(true);
  });

  it('confirma um MP4 real declarado como video/mp4', () => {
    expect(matchesDeclaredMimeType(MP4_HEADER, 'video/mp4')).toBe(true);
  });

  it('rejeita quando o conteúdo real não corresponde ao tipo declarado', () => {
    expect(matchesDeclaredMimeType(PNG_HEADER, 'application/pdf')).toBe(false);
    expect(matchesDeclaredMimeType(JPEG_HEADER, 'image/png')).toBe(false);
  });

  it('rejeita um executável renomeado para .pdf com Content-Type declarado application/pdf', () => {
    expect(matchesDeclaredMimeType(EXE_HEADER, 'application/pdf')).toBe(false);
  });

  it('aceita texto simples plausível declarado como text/plain', () => {
    const text = Buffer.from('Descrição do problema em texto simples.', 'utf8');
    expect(matchesDeclaredMimeType(text, 'text/plain')).toBe(true);
  });

  it('rejeita conteúdo binário declarado como text/plain', () => {
    expect(matchesDeclaredMimeType(EXE_HEADER, 'text/plain')).toBe(false);
  });
});
