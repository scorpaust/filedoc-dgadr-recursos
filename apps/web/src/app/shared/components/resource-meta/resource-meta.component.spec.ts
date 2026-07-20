import { TestBed } from '@angular/core/testing';
import { resources } from '../../mocks/resources.mock';
import { ResourceMetaComponent } from './resource-meta.component';

describe('ResourceMetaComponent', () => {
  function setup(slug: string) {
    const resource = resources.find((candidate) => candidate.slug === slug);
    if (!resource) {
      throw new Error(`No mock resource with slug ${slug}`);
    }
    const fixture = TestBed.createComponent(ResourceMetaComponent);
    fixture.componentRef.setInput('resource', resource);
    fixture.detectChanges();
    return { fixture, resource };
  }

  it('shows the workflow, document type, difficulty and update date of a video resource', () => {
    const { fixture, resource } = setup('criar-um-novo-processo-de-correspondencia');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(resource.workflow);
    expect(el.textContent).toContain(resource.documentType);
    expect(el.textContent).toContain('Iniciação');
    expect(el.textContent).toContain('Duração');
    expect(el.textContent).toContain(resource.duration);
    expect(el.textContent).toContain(resource.updatedAt);
  });

  it('shows the page count, not a duration, for a guide resource', () => {
    const { fixture, resource } = setup('assinar-um-despacho-digitalmente');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Extensão');
    expect(el.textContent).toContain(`${resource.pages} páginas`);
    expect(el.textContent).not.toContain('Duração');
  });

  it('renders every tag associated with the resource', () => {
    const { fixture, resource } = setup('criar-um-novo-processo-de-correspondencia');
    const el = fixture.nativeElement as HTMLElement;
    for (const tag of resource.tags) {
      expect(el.textContent).toContain(tag);
    }
  });

  it('shows the live video duration, formatted as m:ss, instead of the mock value when provided', () => {
    const { fixture, resource } = setup('criar-um-novo-processo-de-correspondencia');
    fixture.componentRef.setInput('liveDurationSeconds', 75);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('1:15');
    expect(el.textContent).not.toContain(resource.duration);
  });

  it('falls back to the mock duration while the live video duration is not yet known', () => {
    const { fixture, resource } = setup('criar-um-novo-processo-de-correspondencia');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(resource.duration);
  });
});
