import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationCenter, Toast } from '../../services/notification-center.service';
import { ToastStack } from './toast-stack';

describe('ToastStack', () => {
  const setup = (toasts: Toast[]) => {
    const center = {
      toasts: signal(toasts),
      dismiss: vi.fn(),
      markSeen: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ToastStack],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: NotificationCenter, useValue: center },
      ],
    });
    const fixture = TestBed.createComponent(ToastStack);
    fixture.detectChanges();
    return { center, el: fixture.nativeElement as HTMLElement };
  };

  it('annonce les toasts dans une région vivante, la commande prête mise en avant', () => {
    const { el } = setup([
      { id: 'n1', message: 'Commande n° 42 en préparation.', link: '/commandes/o1', ready: false },
      { id: 'n2', message: 'Commande n° 43 prête.', link: null, ready: true },
    ]);
    expect(el.querySelector('.toast-stack')?.getAttribute('aria-live')).toBe('polite');
    const toasts = el.querySelectorAll('.toast');
    expect(toasts).toHaveLength(2);
    expect(toasts[0].querySelector('a')?.getAttribute('href')).toBe('/commandes/o1');
    expect(toasts[1].classList).toContain('toast--ready');
    expect(toasts[1].querySelector('a')).toBeNull();
  });

  it('ferme un toast, et le marque lu quand on l’ouvre', () => {
    const { center, el } = setup([
      { id: 'n1', message: 'Commande n° 42 prête.', link: '/commandes/o1', ready: true },
    ]);
    el.querySelector<HTMLButtonElement>('.toast__close')!.click();
    expect(center.dismiss).toHaveBeenCalledWith('n1');

    el.querySelector<HTMLAnchorElement>('.toast__action')!.click();
    expect(center.markSeen).toHaveBeenCalledWith('n1');
  });
});
