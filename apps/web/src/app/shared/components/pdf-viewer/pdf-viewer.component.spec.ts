import { TestBed } from '@angular/core/testing';
import { PdfViewerComponent } from './pdf-viewer.component';

describe('PdfViewerComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.componentRef.setInput('src', '/mock/resource-demo.pdf');
    fixture.componentRef.setInput('title', 'Guia de demonstração');
    fixture.detectChanges();
    return fixture;
  }

  it('renders an embedded iframe pointing at the PDF, with an accessible title', () => {
    const fixture = setup();
    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.title).toBe('Guia de demonstração');
    expect(iframe.src).toContain('/mock/resource-demo.pdf');
  });

  it('always shows a visible download link pointing at the PDF file', () => {
    const fixture = setup();
    const link = fixture.nativeElement.querySelector(
      '.fdr-pdf-viewer__download',
    ) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.hasAttribute('download')).toBe(true);
    expect(link.getAttribute('href')).toBe('/mock/resource-demo.pdf');
    expect(link.textContent).toContain('Descarregar PDF');
  });
});
