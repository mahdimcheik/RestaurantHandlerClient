import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ImageField } from './image-field';

@Component({
  imports: [ImageField],
  template: `
    <app-image-field
      label="Photo"
      [imageUrl]="imageUrl()"
      [upload]="upload"
      [remove]="withRemove() ? remove : undefined"
    />
  `,
})
class Host {
  readonly imageUrl = signal<string | null>('https://cdn.test/catalog/a.webp');
  readonly withRemove = signal(true);
  readonly upload = vi.fn(() => of({}));
  readonly remove = vi.fn(() => of({}));
}

describe('ImageField', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  const removeButton = () =>
    [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.trim() === 'Retirer la photo',
    ) as HTMLButtonElement | undefined;

  it('retire la photo et annonce le résultat', async () => {
    removeButton()!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.remove).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Photo retirée.');
  });

  it('masque le bouton sans photo ou sans action de retrait', async () => {
    fixture.componentInstance.imageUrl.set(null);
    await fixture.whenStable();
    expect(removeButton()).toBeUndefined();

    fixture.componentInstance.imageUrl.set('https://cdn.test/catalog/a.webp');
    fixture.componentInstance.withRemove.set(false);
    await fixture.whenStable();
    expect(removeButton()).toBeUndefined();
  });

  const pick = (file: File) => {
    const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  };

  it('envoie la photo choisie et propose de la changer', async () => {
    expect(fixture.nativeElement.textContent).toContain('Changer la photo');
    pick(new File(['x'], 'a.png', { type: 'image/png' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.upload).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Photo enregistrée.');
  });

  it('refuse un format non pris en charge sans envoyer', async () => {
    pick(new File(['x'], 'a.gif', { type: 'image/gif' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.upload).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Format non pris en charge');
  });
});
