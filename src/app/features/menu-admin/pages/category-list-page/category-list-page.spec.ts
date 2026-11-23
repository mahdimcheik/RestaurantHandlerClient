import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryDetails } from '../../../../core/api/generated';
import { clickButton, envelope, text } from '../../testing';
import { CategoryListPage } from './category-list-page';

const category = (id: string, name: string, position: number): CategoryDetails => ({
  id,
  name,
  position,
  isActive: true,
  isArchived: false,
  activeProductCount: 0,
});

const list = [category('a', 'Entrées', 0), category('b', 'Plats', 1)];

describe('CategoryListPage', () => {
  let fixture: ComponentFixture<CategoryListPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CategoryListPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(CategoryListPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/manage/categories').flush(envelope(list));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('envoie le nouvel ordre des catégories', async () => {
    clickButton(fixture, 'Monter « Plats »');
    await Promise.resolve();

    const request = http.expectOne('/manage/categories/reorder');
    expect(request.request.body).toEqual({ orderedIds: ['b', 'a'] });
    request.flush(envelope([list[1], list[0]]));
    await Promise.resolve();
    TestBed.tick();
    http.match((r) => r.method === 'GET').forEach((r) => r.flush(envelope([list[1], list[0]])));
    await fixture.whenStable();
  });

  it('affiche le refus de l’API et recharge la liste en cas de conflit', async () => {
    clickButton(fixture, 'Descendre « Entrées »');
    await Promise.resolve();

    const message = 'La liste ne correspond pas aux éléments actuels : rechargez puis réessayez.';
    http
      .expectOne('/manage/categories/reorder')
      .flush({ message, status: 409 }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    TestBed.tick();
    http.expectOne('/manage/categories').flush(envelope(list));
    await fixture.whenStable();

    expect(text(fixture)).toContain(message);
  });

  it('masque la colonne d’ordre quand les archivées sont affichées', async () => {
    const box = fixture.nativeElement.querySelector('input[type=checkbox]') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    await Promise.resolve();
    TestBed.tick();
    http.expectOne('/manage/categories?includeArchived=true').flush(envelope(list));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-move-buttons')).toBeNull();
  });
});
