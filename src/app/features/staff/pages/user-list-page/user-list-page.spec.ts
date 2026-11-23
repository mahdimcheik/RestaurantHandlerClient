import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ACCOUNT_STATUS_IDS } from '../../../../shared/services/user-management.service';
import { clickButton, envelope, fill, submitForm, text } from '../../../../shared/testing';
import { account, ROLES } from '../../testing';
import { PAGE_SIZE, UserListPage } from './user-list-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

describe('UserListPage', () => {
  let fixture: ComponentFixture<UserListPage>;
  let http: HttpTestingController;

  const answerFilter = async (users = [account()], count = users.length) => {
    TestBed.tick();
    const request = http.expectOne('/users/filter');
    request.flush({ ...envelope(users), count });
    await settle();
    return request.request.body;
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UserListPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(UserListPage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/roles/all').flush(envelope(ROLES));
  });

  afterEach(() => http.verify());

  it('liste les comptes avec leur statut en toutes lettres', async () => {
    const body = await answerFilter([
      account(),
      account({
        id: 'u2',
        firstName: 'Tom',
        lastName: 'Durand',
        status: { id: ACCOUNT_STATUS_IDS.Banned, name: 'Banned' },
      }),
    ]);
    expect(body).toEqual({ name: null, roleId: null, statusId: null, first: 0, row: PAGE_SIZE });
    expect(text(fixture)).toContain('Léa Martin');
    expect(text(fixture)).toContain('06 12 34 56 78');
    expect(text(fixture)).toContain('Banni');
    expect(text(fixture)).toContain('2 comptes');
  });

  it('recherche et filtre par rôle et statut', async () => {
    await answerFilter();
    fill(fixture, 'Nom, e-mail ou téléphone', ' 0612 ');
    fill(fixture, 'Rôle', 'role-client');
    fill(fixture, 'Statut', 'Banned');
    submitForm(fixture);
    const body = await answerFilter([]);
    expect(body).toEqual({
      name: '0612',
      roleId: 'role-client',
      statusId: ACCOUNT_STATUS_IDS.Banned,
      first: 0,
      row: PAGE_SIZE,
    });
    expect(text(fixture)).toContain('Aucun compte ne correspond.');
  });

  it('pagine côté serveur', async () => {
    await answerFilter([account()], 45);
    expect(text(fixture)).toContain('Page 1 sur 3');
    clickButton(fixture, 'Page suivante');
    const body = await answerFilter([account()], 45);
    expect(body.first).toBe(PAGE_SIZE);
    expect(text(fixture)).toContain('Page 2 sur 3');
  });
});
