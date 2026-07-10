import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService } from './dialog.service';

@Component({ template: '<p>Conteúdo de teste</p>' })
class TestDialogContentComponent {}

describe('DialogService', () => {
  let service: DialogService;
  let overlayContainer: OverlayContainer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DialogService);
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('opens a component with a backdrop and focus management enabled by default', () => {
    const ref = service.open(TestDialogContentComponent);
    expect(ref.componentInstance).toBeInstanceOf(TestDialogContentComponent);
    expect(
      overlayContainer.getContainerElement().querySelector('.cdk-overlay-backdrop'),
    ).toBeTruthy();
    ref.close();
  });

  it('closes all open dialogs', () => {
    service.open(TestDialogContentComponent);
    service.open(TestDialogContentComponent);
    service.closeAll();
    expect(
      overlayContainer.getContainerElement().querySelectorAll('.cdk-dialog-container').length,
    ).toBe(0);
  });
});
