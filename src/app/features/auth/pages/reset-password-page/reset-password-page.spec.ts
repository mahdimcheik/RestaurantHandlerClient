import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { flushRestaurantInfo, submitForm, text, typeInto } from '../../testing';
import { ResetPasswordPage } from './reset-password-page';

describe('ResetPasswordPage', () => {
  let fixture: ComponentFixture<ResetPasswordPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fakeRealtime().provider,
      ],
    });
    fixture = TestBed.createComponent(ResetPasswordPage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    flushRestaurantInfo(http);
  });

  afterEach(() => {
    flushRestaurantInfo(http);
    http.verify();
  });

  it('signale un lien incomplet', async () => {
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
    expect(text(fixture)).toContain('Demander un nouveau lien');
  });

  describe('avec un lien', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('userId', 'u1');
      fixture.componentRef.setInput('resetToken', 'tok+en/=');
      await fixture.whenStable();
    });

    it('refuse deux mots de passe différents', async () => {
      typeInto(fixture, 0, 'secret123');
      typeInto(fixture, 1, 'secret124');
      submitForm(fixture);
      await fixture.whenStable();

      http.expectNone('/auth/reset-password');
      expect(text(fixture)).toContain('ne correspondent pas');
    });

    it('enregistre le mot de passe puis affiche la confirmation', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      typeInto(fixture, 0, 'secret123');
      typeInto(fixture, 1, 'secret123');
      submitForm(fixture);

      const request = http.expectOne('/auth/reset-password');
      expect(request.request.body).toEqual({
        password: 'secret123',
        passwordConfirmation: 'secret123',
        userId: 'u1',
        resetToken: 'tok+en/=',
      });
      request.flush('http://localhost:4200/auth/password-reset-success');
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/auth/password-reset-success']);
    });

    it('propose un nouveau lien si le serveur le refuse', async () => {
      typeInto(fixture, 0, 'secret123');
      typeInto(fixture, 1, 'secret123');
      submitForm(fixture);
      http
        .expectOne('/auth/reset-password')
        .flush({ message: 'x', status: 404 }, { status: 400, statusText: '' });
      await fixture.whenStable();

      expect(text(fixture)).toContain("n'est plus valide");
      expect(text(fixture)).toContain('Demander un nouveau lien');
    });
  });
});
