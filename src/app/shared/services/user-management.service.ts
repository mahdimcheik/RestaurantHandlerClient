import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountStatusEnum, UserDetails, UserManagementApi } from '../../core/api/generated';
import { unwrap } from './api-operators';

/**
 * Identifiants des statuts de compte, fixés par l'amorçage de l'API (`HardCode.ACCOUNT_*`) ;
 * l'API n'expose pas de liste des statuts.
 */
export const ACCOUNT_STATUS_IDS: Record<AccountStatusEnum, string> = {
  Active: '12e65875-bec4-422a-aad4-c28de0e06fff',
  Pending: 'acc9ddb6-824b-42cb-8276-5d91b6af2003',
  Banned: 'fd2621ef-85f0-46a6-acdd-c77fb111630f',
};

/** Statut d'un compte à partir de son identifiant ; `null` s'il est inconnu. */
export function accountStatusOf(statusId: string | null | undefined): AccountStatusEnum | null {
  const entry = Object.entries(ACCOUNT_STATUS_IDS).find(([, id]) => id === statusId);
  return entry ? (entry[0] as AccountStatusEnum) : null;
}

@Service()
export class UserManagementService {
  private readonly api = inject(UserManagementApi);

  setStatus(userId: string, status: AccountStatusEnum): Observable<UserDetails> {
    return this.api
      .usermanagementUsersUserIdStatusPatch({ userId, statusId: ACCOUNT_STATUS_IDS[status] })
      .pipe(unwrap());
  }
}
