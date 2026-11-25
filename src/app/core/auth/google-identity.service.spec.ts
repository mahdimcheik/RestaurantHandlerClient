import { TestBed } from '@angular/core/testing';
import { GOOGLE_CLIENT_ID } from './auth.config';
import { GoogleIdentityService } from './google-identity.service';

describe('GoogleIdentityService', () => {
  function create(clientId: string): GoogleIdentityService {
    TestBed.configureTestingModule({
      providers: [{ provide: GOOGLE_CLIENT_ID, useValue: clientId }],
    });
    return TestBed.inject(GoogleIdentityService);
  }

  it('est désactivé sans identifiant client', () => {
    expect(create('').enabled).toBe(false);
  });

  it('est activé avec un identifiant client', () => {
    expect(create('123.apps.googleusercontent.com').enabled).toBe(true);
  });
});
