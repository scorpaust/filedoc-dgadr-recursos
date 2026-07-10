import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Resource } from '../../models';
import { ResourceCardComponent } from './resource-card.component';

const videoResource: Resource = {
  id: 'res-1',
  title: 'Criar um novo processo de correspondência',
  description: 'Como registar corretamente um processo desde o primeiro passo.',
  type: 'video',
  workflow: 'Criação e registo',
  documentType: 'Correspondência',
  difficulty: 'iniciacao',
  duration: '6 min',
  updatedAt: '2026-07-02',
  status: 'published',
  author: 'Marta Silva',
  relatedResourceIds: [],
};

const guideResource: Resource = {
  ...videoResource,
  id: 'res-2',
  type: 'guide',
  pages: 8,
  duration: undefined,
};

describe('ResourceCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders a video resource with its duration and a link to the detail route', async () => {
    const fixture = TestBed.createComponent(ResourceCardComponent);
    fixture.componentRef.setInput('resource', videoResource);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-resource-card__title')?.textContent).toContain(
      videoResource.title,
    );
    expect(el.querySelector('.fdr-resource-card__type-badge')?.textContent).toContain('VÍDEO');
    expect(el.querySelector('.fdr-resource-card__footer')?.textContent).toContain('6 min');
    expect(el.querySelector('.fdr-resource-card__action')?.textContent).toContain('Ver vídeo');
    expect((el.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe(
      '/recursos/res-1',
    );
  });

  it('renders a guide resource with its page count and the guide action label', async () => {
    const fixture = TestBed.createComponent(ResourceCardComponent);
    fixture.componentRef.setInput('resource', guideResource);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-resource-card__type-badge')?.textContent).toContain('GUIA');
    expect(el.querySelector('.fdr-resource-card__footer')?.textContent).toContain('8 páginas');
    expect(el.querySelector('.fdr-resource-card__action')?.textContent).toContain('Abrir guia');
  });
});
