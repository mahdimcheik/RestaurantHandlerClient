import { signal, Signal } from '@angular/core';

let context: AudioContext | null = null;
let armed = false;

/**
 * Carillon court joué par Web Audio (aucun fichier). Le navigateur n'autorise le son qu'après
 * un geste de l'utilisateur : le contexte audio, partagé, est créé au premier appui sur la page.
 */
export function webAudioChime(): () => void {
  if (!armed && typeof document !== 'undefined' && typeof AudioContext !== 'undefined') {
    armed = true;
    document.addEventListener('pointerdown', () => (context ??= new AudioContext()), {
      once: true,
    });
  }
  return () => {
    const audio = context;
    if (!audio) {
      return;
    }
    const start = audio.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const at = start + index * 0.18;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.32);
    });
  };
}

export interface SoundSetting {
  readonly muted: Signal<boolean>;
  toggle(): void;
}

/** Son coupable, réglage propre à l'appareil (`localStorage[key] = 'off'` quand il est coupé). */
export function soundSetting(key: string): SoundSetting {
  let initial = false;
  try {
    initial = localStorage.getItem(key) === 'off';
  } catch {
    // Stockage indisponible (navigation privée) : son actif.
  }
  const muted = signal(initial);
  return {
    muted: muted.asReadonly(),
    toggle: () => {
      const next = !muted();
      muted.set(next);
      try {
        if (next) {
          localStorage.setItem(key, 'off');
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // Stockage indisponible : le réglage vaut pour la session.
      }
    },
  };
}
