import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeRealtime } from '../../core/realtime/testing';
import { envelope, text } from '../../shared/testing';
import { LegalPage } from './legal-page';

describe('LegalPage', () => {
  it('affiche l’identité du vendeur et signale les rubriques à rédiger', async () => {
    TestBed.configureTestingModule({
      imports: [LegalPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        fakeRealtime().provider,
      ],
    });
    const fixture = TestBed.createComponent(LegalPage);
    fixture.componentRef.setInput('page', 'notice');
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne('/restaurant/info')
      .flush(
        envelope({
          tradeName: 'Chez Nino',
          legalName: 'Nino SAS',
          siret: '12345678900011',
          hours: [],
          upcomingClosures: [],
        }),
      );
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Mentions légales');
    expect(text(fixture)).toContain('Nino SAS');
    expect(text(fixture)).toContain("sous l'enseigne Chez Nino");
    expect(text(fixture)).toContain('SIRET 12345678900011');
    expect(text(fixture)).toContain('À rédiger.');
  });
});
