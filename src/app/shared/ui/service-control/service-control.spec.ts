import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpeningStateDto } from '../../../core/api/generated';
import { clickButton, envelope, text } from '../../testing';
import { ServiceControl } from './service-control';

const state = (overrides: Partial<OpeningStateDto>): OpeningStateDto => ({
  status: 'Open',
  asapDelayMinutes: 15,
  ...overrides,
});

describe('ServiceControl', () => {
  let fixture: ComponentFixture<ServiceControl>;
  let http: HttpTestingController;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
  });

  async function setup(initial: OpeningStateDto): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ServiceControl],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ServiceControl);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/restaurant/status').flush(envelope(initial));
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('affiche l’état en toutes lettres', async () => {
    await setup(state({ status: 'Closed' }));
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('Fermé');
  });

  it('met les commandes en pause pour la durée choisie', async () => {
    await setup(state({}));
    clickButton(fixture, '30 min');
    const request = http.expectOne('/manage/restaurant/pause');
    expect(request.request.body).toEqual({ durationMinutes: 30 });
    request.flush(envelope(state({ status: 'Paused' })));
    await fixture.whenStable();

    expect(text(fixture)).toContain('Commandes en pause');
    expect(text(fixture)).toContain('Reprendre les commandes');
  });

  it('met en pause sans fin, puis reprend', async () => {
    await setup(state({}));
    clickButton(fixture, "Jusqu'à reprise");
    const pause = http.expectOne('/manage/restaurant/pause');
    expect(pause.request.body).toEqual({ durationMinutes: null });
    pause.flush(envelope(state({ status: 'Paused' })));
    await fixture.whenStable();

    clickButton(fixture, 'Reprendre les commandes');
    http.expectOne('/manage/restaurant/resume').flush(envelope(state({})));
    await fixture.whenStable();
    expect(text(fixture)).toContain('Ouvert');
  });

  it('ajuste le délai annoncé en renvoyant tous les réglages', async () => {
    await setup(state({ asapDelayMinutes: 15 }));
    clickButton(fixture, 'Augmenter de 5 minutes');
    http
      .expectOne('/manage/restaurant/settings')
      .flush(envelope({ tradeName: 'Chez Nino', isPaused: false, asapDelayMinutes: 15 }));
    await Promise.resolve();
    const put = http.expectOne((r) => r.method === 'PUT');
    expect(put.request.body).toEqual(
      expect.objectContaining({ tradeName: 'Chez Nino', asapDelayMinutes: 20 }),
    );
    put.flush(envelope({ tradeName: 'Chez Nino', isPaused: false, asapDelayMinutes: 20 }));
    await Promise.resolve();
    TestBed.tick();
    http.expectOne('/restaurant/status').flush(envelope(state({ asapDelayMinutes: 20 })));
    await fixture.whenStable();
    expect(text(fixture)).toContain('20 min');
  });
});
