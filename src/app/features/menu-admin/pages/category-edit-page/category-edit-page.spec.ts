import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CategoryDetails } from '../../../../core/api/generated';
import { envelope, fill, submitForm, text } from '../../testing';
import { CategoryEditPage } from './category-edit-page';

const category = (overrides: Partial<CategoryDetails> = {}): CategoryDetails => ({
  id: 'c1',
  name: 'Burgers',
  description: null,
  imageUrl: null,
  isActive: true,
  isArchived: false,
  position: 0,
  activeProductCount: 2,
  ...overrides,
});

describe('CategoryEditPage', () => {
  let fixture: ComponentFixture<CategoryEditPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CategoryEditPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(CategoryEditPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(id: string, data: CategoryDetails): Promise<void> {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    http.expectOne((request) => request.url === '/manage/categories').flush(envelope([data]));
    await fixture.whenStable();
  }

  it('refuse un nom vide sans appeler l’API', async () => {
    await fixture.whenStable();
    submitForm(fixture);
    await fixture.whenStable();

    http.expectNone('/manage/categories');
    expect(text(fixture)).toContain('Ce champ est obligatoire.');
  });

  it('crée la catégorie puis ouvre sa fiche', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
    fill(fixture, 'Nom', '  Pizzas ');
    submitForm(fixture);

    const request = http.expectOne('/manage/categories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Pizzas', description: null, isActive: true });
    request.flush(envelope(category({ id: 'c2', name: 'Pizzas' })));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/gestion/categories', 'c2'], { replaceUrl: true });
  });

  it('enregistre une modification et l’annonce', async () => {
    await open('c1', category());
    fill(fixture, 'Nom', 'Burgers maison');
    submitForm(fixture);

    const request = http.expectOne('/manage/categories/c1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.name).toBe('Burgers maison');
    request.flush(envelope(category({ name: 'Burgers maison' })));
    await fixture.whenStable();

    expect(text(fixture)).toContain('Modifications enregistrées.');
  });

  it('affiche le refus du serveur', async () => {
    await open('c1', category());
    submitForm(fixture);
    http
      .expectOne('/manage/categories/c1')
      .flush(
        { message: 'Une catégorie « Burgers » existe déjà.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role=alert]');
    expect(alert?.textContent).toContain('existe déjà');
  });

  it('montre une catégorie archivée en lecture seule', async () => {
    await open('c1', category({ isArchived: true, isActive: false }));

    expect(text(fixture)).toContain('Cet élément est archivé');
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
    expect(text(fixture)).not.toContain('Archiver');
  });
});
