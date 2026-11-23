import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserAdminDetails, UserDetails } from '../../../../core/api/generated';
import { SessionService } from '../../../../core/auth/session.service';
import { ACCOUNT_STATUS_IDS } from '../../../../shared/services/user-management.service';
import { clickButton, envelope, polyfillDialog, summary, text } from '../../../../shared/testing';
import { account } from '../../testing';
import { UserPage } from './user-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

describe('UserPage', () => {
  let fixture: ComponentFixture<UserPage>;
  let http: HttpTestingController;
  const me = signal<UserDetails | null>(null);

  const answerUser = async (user: UserAdminDetails) => {
    TestBed.tick();
    http.expectOne('/users/u1').flush(envelope(user));
    await settle();
  };

  const open = async (user = account(), orders = [summary({ id: 'o1', dailyNumber: 7 })]) => {
    fixture.componentRef.setInput('id', 'u1');
    TestBed.tick();
    http.expectOne('/users/u1').flush(envelope(user));
    http
      .expectOne((r) => r.url === '/manage/customers/u1/orders')
      .flush({ ...envelope(orders), count: orders.length });
    await settle();
  };

  const buttons = () =>
    [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.sheet button',
      ),
    ].map((button) => button.textContent?.trim());

  const confirm = () =>
    [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'dialog[open] .btn--danger',
      ),
    ][0].click();

  beforeEach(() => {
    polyfillDialog();
    me.set(account({ id: 'me', roles: [] }));
    TestBed.configureTestingModule({
      imports: [UserPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SessionService, useValue: { user: me } },
      ],
    });
    fixture = TestBed.createComponent(UserPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('montre la fiche et les commandes du client', async () => {
    await open();
    expect(text(fixture)).toContain('Léa Martin');
    expect(text(fixture)).toContain('Actif');
    expect(text(fixture)).toContain('Aucune non-venue');
    expect(text(fixture)).toContain('N° 7');
    expect(buttons()).toEqual(['Bannir']);
  });

  it('bannit après confirmation puis relit la fiche', async () => {
    await open();
    clickButton(fixture, 'Bannir');
    await settle();
    confirm();
    const request = http.expectOne((r) => r.url === '/usermanagement/users/u1/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.params.get('statusId')).toBe(ACCOUNT_STATUS_IDS.Banned);
    request.flush(envelope(account()));
    await answerUser(account({ status: { id: ACCOUNT_STATUS_IDS.Banned, name: 'Banned' } }));
    expect(text(fixture)).toContain('Statut du compte : Banni.');
    expect(text(fixture)).toContain('Activer le compte');
  });

  it('affiche le refus du serveur (dernier Manager actif)', async () => {
    await open();
    clickButton(fixture, 'Bannir');
    await settle();
    confirm();
    http
      .expectOne((r) => r.url === '/usermanagement/users/u1/status')
      .flush(
        { message: "Impossible d'écarter le dernier Manager actif", status: 400 },
        { status: 400, statusText: 'Bad Request' },
      );
    await answerUser(account());
    expect(text(fixture)).toContain("Impossible d'écarter le dernier Manager actif");
  });

  it('lève le blocage du paiement au retrait', async () => {
    await open(account({ noShowCount: 2 }));
    expect(text(fixture)).toContain('2 non-venues');
    clickButton(fixture, 'Réautoriser le paiement au retrait');
    await settle();
    confirm();
    const request = http.expectOne('/manage/customers/u1/no-shows/reset');
    expect(request.request.method).toBe('POST');
    request.flush({ message: 'OK', status: 200 });
    await answerUser(account({ noShowCount: 0 }));
    expect(text(fixture)).toContain('Le paiement au retrait est de nouveau autorisé.');
    expect(text(fixture)).toContain('Aucune non-venue');
  });

  it('n’offre pas d’action sur son propre compte', async () => {
    me.set(account({ id: 'u1' }));
    await open();
    expect(text(fixture)).toContain("C'est votre compte.");
    expect(buttons()).toEqual([]);
  });
});
