import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClosureDetails, OpeningRangeDto } from '../../../../core/api/generated';
import {
  clickButton,
  control,
  envelope,
  fill,
  text,
} from '../../../../shared/testing';
import { closurePeriod, OpeningPage, toClosureWrite, toWeek, toWeekUpdate } from './opening-page';

const hours: OpeningRangeDto[] = [
  { dayOfWeek: 'Tuesday', start: '18:30:00', end: '22:00:00' },
  { dayOfWeek: 'Tuesday', start: '11:30:00', end: '14:30:00' },
];

const christmas: ClosureDetails = {
  id: 'c1',
  startLocal: '2026-12-25T00:00:00',
  endLocal: '2026-12-26T00:00:00',
  reason: 'Noël',
};

describe('OpeningPage', () => {
  describe('conversions', () => {
    it('range les plages par jour, du lundi au dimanche', () => {
      const week = toWeek(hours);
      expect(week.days.map((day) => day.day)[0]).toBe('Monday');
      expect(week.days[1].ranges).toEqual([
        { start: '11:30', end: '14:30' },
        { start: '18:30', end: '22:00' },
      ]);
      expect(toWeekUpdate(week).ranges).toEqual([
        { dayOfWeek: 'Tuesday', start: '11:30:00', end: '14:30:00' },
        { dayOfWeek: 'Tuesday', start: '18:30:00', end: '22:00:00' },
      ]);
    });

    it('ferme des journées entières jusqu’au lendemain du dernier jour', () => {
      const base = { start: '', end: '', reason: ' Congés ' };
      expect(
        toClosureWrite({ ...base, wholeDays: true, startDate: '2026-08-01', endDate: '2026-08-15' }),
      ).toEqual({
        startLocal: '2026-08-01T00:00:00',
        endLocal: '2026-08-16T00:00:00',
        reason: 'Congés',
      });
      expect(
        toClosureWrite({ ...base, wholeDays: true, startDate: '2026-12-25', endDate: '' })
          .endLocal,
      ).toBe('2026-12-26T00:00:00');
      expect(
        toClosureWrite({
          ...base,
          wholeDays: false,
          startDate: '',
          endDate: '',
          start: '2026-12-31T18:00',
          end: '2027-01-01T02:00',
        }),
      ).toEqual(
        expect.objectContaining({
          startLocal: '2026-12-31T18:00:00',
          endLocal: '2027-01-01T02:00:00',
        }),
      );
    });

    it('affiche un jour fermé sans le lendemain', () => {
      expect(closurePeriod(christmas)).toMatch(/^Le .*25/);
      expect(closurePeriod(christmas)).not.toContain('26 déc');
    });
  });

  describe('écran', () => {
    let fixture: ComponentFixture<OpeningPage>;
    let http: HttpTestingController;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        imports: [OpeningPage],
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      fixture = TestBed.createComponent(OpeningPage);
      http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne('/manage/restaurant/hours').flush(envelope(hours));
      http
        .expectOne((r) => r.url === '/manage/restaurant/closures')
        .flush(envelope([christmas]));
      await fixture.whenStable();
    });

    afterEach(() => http.verify());

    it('liste les fermetures à venir avec leur motif', () => {
      expect(text(fixture)).toContain('Noël');
      expect(text(fixture)).toContain('Lundi');
    });

    it('enregistre toute la semaine', async () => {
      // Lundi : première plage proposée, le midi.
      clickButton(fixture, 'Ajouter une plage');
      await fixture.whenStable();
      fixture.nativeElement.querySelectorAll('form')[0].dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();

      const put = http.expectOne((r) => r.method === 'PUT');
      expect(put.request.body.ranges).toEqual([
        { dayOfWeek: 'Monday', start: '11:30:00', end: '14:30:00' },
        { dayOfWeek: 'Tuesday', start: '11:30:00', end: '14:30:00' },
        { dayOfWeek: 'Tuesday', start: '18:30:00', end: '22:00:00' },
      ]);
      put.flush(envelope([]));
      await Promise.resolve();
      TestBed.tick();
      http.match('/manage/restaurant/hours').forEach((r) => r.flush(envelope([])));
      await fixture.whenStable();
      expect(text(fixture)).toContain('Horaires enregistrés.');
    });

    it('refuse une plage qui finit avant de commencer', async () => {
      fill(fixture, 'Fin', '10:00', 0);
      fixture.nativeElement.querySelectorAll('form')[0].dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();
      expect(text(fixture)).toContain('La fin doit suivre le début.');
      http.expectNone((r) => r.method === 'PUT');
    });

    it('ajoute une fermeture d’un jour', async () => {
      fill(fixture, 'Du', '2027-01-01');
      fill(fixture, 'Motif affiché aux clients (facultatif)', 'Jour de l’an');
      fixture.nativeElement.querySelectorAll('form')[1].dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();

      const post = http.expectOne((r) => r.method === 'POST');
      expect(post.request.body).toEqual({
        startLocal: '2027-01-01T00:00:00',
        endLocal: '2027-01-02T00:00:00',
        reason: 'Jour de l’an',
      });
      post.flush(envelope({ ...christmas, id: 'c2' }));
      await Promise.resolve();
      TestBed.tick();
      http.match((r) => r.method === 'GET').forEach((r) => r.flush(envelope([])));
      await fixture.whenStable();
      expect(text(fixture)).toContain('Fermeture ajoutée.');
      expect(control(fixture, 'Du').value).toBe('');
    });
  });
});
