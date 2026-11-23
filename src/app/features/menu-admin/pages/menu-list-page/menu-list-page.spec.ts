import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuDetails } from '../../../../core/api/generated';
import { clickButton, envelope, text } from '../../../../shared/testing';
import { MenuListPage } from './menu-list-page';

const menu = (id: string, name: string, position: number): MenuDetails => ({
  id,
  name,
  position,
  priceCents: 1200,
  vatRate: 10,
  isActive: true,
  isArchived: false,
  slots: [],
});

const list = [menu('a', 'Midi', 0), menu('b', 'Soir', 1), menu('c', 'Enfant', 2)];

describe('MenuListPage', () => {
  let fixture: ComponentFixture<MenuListPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MenuListPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(MenuListPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/manage/menus').flush(envelope(list));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('envoie l’ordre complet après un déplacement', async () => {
    clickButton(fixture, 'Descendre « Midi »');
    await Promise.resolve();

    const request = http.expectOne('/manage/menus/reorder');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ orderedIds: ['b', 'a', 'c'] });
    request.flush(envelope([list[1], list[0], list[2]]));
    await Promise.resolve();
    TestBed.tick();
    http.expectOne('/manage/menus').flush(envelope([list[1], list[0], list[2]]));
    await fixture.whenStable();

    expect(text(fixture)).toContain('« Midi » déplacé en position 2.');
  });

  it('désactive la montée du premier et la descente du dernier', () => {
    const disabled = [...fixture.nativeElement.querySelectorAll('button[disabled]')].map(
      (button: HTMLButtonElement) => button.title,
    );
    expect(disabled).toEqual(['Monter « Midi »', 'Descendre « Enfant »']);
  });
});
