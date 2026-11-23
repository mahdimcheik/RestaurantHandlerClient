import { weeklyHours } from './home-format';

describe('weeklyHours', () => {
  it('liste la semaine du lundi au dimanche, plages triées, jours fermés signalés', () => {
    const week = weeklyHours([
      { dayOfWeek: 'Tuesday', start: '18:30:00', end: '22:00:00' },
      { dayOfWeek: 'Tuesday', start: '11:30:00', end: '14:30:00' },
    ]);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ day: 'Lundi', ranges: null });
    expect(week[1]).toEqual({ day: 'Mardi', ranges: '11:30 – 14:30, 18:30 – 22:00' });
  });
});
