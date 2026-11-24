import { AccountStatusEnum, UserDetails } from '../../core/api/generated';
import { accountStatusOf } from '../../shared/services/user-management.service';

export const ACCOUNT_STATUSES: readonly AccountStatusEnum[] = ['Active', 'Pending', 'Banned'];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatusEnum, string> = {
  Active: 'Actif',
  Pending: 'En attente',
  Banned: 'Banni',
};

/** Statut d'un compte, d'après son identifiant ou à défaut son nom technique. */
export function userStatus(user: Pick<UserDetails, 'status'>): AccountStatusEnum | null {
  return (
    accountStatusOf(user.status?.id) ??
    ACCOUNT_STATUSES.find((status) => status === user.status?.name) ??
    null
  );
}

/** « Prénom Nom », ou l'e-mail si le compte n'a pas de nom. */
export function userName(user: Pick<UserDetails, 'firstName' | 'lastName' | 'email'>): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email || '—';
}

/** Rôles d'un compte, séparés par des virgules. */
export function roleNames(user: Pick<UserDetails, 'roles'>): string {
  return user.roles
    .map((role) => role.name)
    .filter(Boolean)
    .join(', ');
}
