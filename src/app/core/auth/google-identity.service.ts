import { DOCUMENT, inject, Service } from '@angular/core';
import { GOOGLE_CLIENT_ID } from './auth.config';

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
}

type GoogleWindow = Window & { google?: { accounts: { id: GoogleAccountsId } } };

/** Google Identity Services : script chargé à la demande, bouton officiel, ID token. */
@Service()
export class GoogleIdentityService {
  private readonly document = inject(DOCUMENT);
  private readonly clientId = inject(GOOGLE_CLIENT_ID);
  private loading: Promise<GoogleAccountsId> | null = null;

  readonly enabled = this.clientId !== '';

  /** Affiche le bouton dans `parent` ; `onCredential` reçoit l'ID token à transmettre à l'API. */
  async renderButton(parent: HTMLElement, onCredential: (idToken: string) => void): Promise<void> {
    const accounts = await this.load();
    accounts.initialize({
      client_id: this.clientId,
      callback: (response) => onCredential(response.credential),
    });
    accounts.renderButton(parent, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      locale: 'fr',
      width: Math.min(parent.clientWidth || 400, 400),
    });
  }

  private load(): Promise<GoogleAccountsId> {
    this.loading ??= new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        const accounts = (this.document.defaultView as GoogleWindow | null)?.google?.accounts.id;
        if (accounts) {
          resolve(accounts);
        } else {
          reject(new Error('Google Identity Services indisponible.'));
        }
      };
      script.onerror = () => {
        this.loading = null;
        reject(new Error('Google Identity Services indisponible.'));
      };
      this.document.head.appendChild(script);
    });
    return this.loading;
  }
}
