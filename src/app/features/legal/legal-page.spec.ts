import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeRealtime } from '../../core/realtime/testing';
import { envelope, text } from '../../shared/testing';
import { LegalPage } from './legal-page';
import { NoticePage } from './pages/notice-page/notice-page';
import { PrivacyPage } from './pages/privacy-page/privacy-page';

const info = {
  tradeName: 'Chez Nino',
  legalName: 'Nino SAS',
  siret: '12345678900011',
  hours: [],
  upcomingClosures: [],
};

async function render<T>(component: Type<T>, page?: string) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      fakeRealtime().provider,
    ],
  });
  const fixture = TestBed.createComponent(component);
  if (page) {
    fixture.componentRef.setInput('page', page);
  }
  TestBed.tick();
  TestBed.inject(HttpTestingController)
    .match('/restaurant/info')
    .forEach((request) => request.flush(envelope(info)));
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Pages légales', () => {
  it('CGV : identité du vendeur et rubriques à rédiger signalées', async () => {
    const { fixture, el } = await render(LegalPage, 'terms');
    expect(el.querySelector('h1')?.textContent).toContain('Conditions générales de vente');
    expect(text(fixture)).toContain('Nino SAS');
    expect(text(fixture)).toContain('Chez Nino');
    expect(text(fixture)).toContain('12345678900011');
    expect(text(fixture)).toContain('À rédiger.');
  });

  it('Confidentialité : sommaire à ancres, responsable, droits et lien CNIL', async () => {
    const { fixture, el } = await render(PrivacyPage);
    expect(el.querySelector('h1')?.textContent).toContain('Politique de confidentialité');
    expect(text(fixture)).toContain('Dernière mise à jour');
    const toc = [...el.querySelectorAll<HTMLAnchorElement>('.legal__toc a')];
    expect(toc.length).toBe(9);
    for (const link of toc) {
      const id = link.getAttribute('href')?.split('#')[1];
      expect(id && el.querySelector(`#${id}`)).toBeTruthy();
    }
    expect(el.querySelector('#responsable')?.textContent).toContain('Nino SAS');
    expect(el.querySelector('#droits a[href="https://www.cnil.fr"]')).not.toBeNull();
    // E-mail non renseigné dans SITE_DETAILS : signalé, pas inventé.
    expect(el.querySelector('#droits .legal__todo')).not.toBeNull();
  });

  it('Mentions légales : éditeur, hébergeur et champs à compléter', async () => {
    const { fixture, el } = await render(NoticePage);
    expect(el.querySelector('h1')?.textContent).toContain('Mentions légales');
    expect(el.querySelector('#editeur')?.textContent).toContain('Nino SAS');
    expect(el.querySelector('#editeur')?.textContent).toContain('Directeur de la publication');
    expect(el.querySelector('#hebergement .legal__todo')).not.toBeNull();
    expect(el.querySelector('#donnees a[href="/confidentialite"]')).not.toBeNull();
    expect(text(fixture)).toContain('Propriété intellectuelle');
  });
});
