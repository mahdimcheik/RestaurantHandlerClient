import { RoleDetails, UserAdminDetails } from '../../core/api/generated';
import { ACCOUNT_STATUS_IDS } from '../../shared/services/user-management.service';

export const ROLES: RoleDetails[] = [
  { id: 'role-manager', name: 'Manager', color: null },
  { id: 'role-client', name: 'Client', color: null },
];

export function account(extra: Partial<UserAdminDetails> = {}): UserAdminDetails {
  return {
    id: 'u1',
    firstName: 'Léa',
    lastName: 'Martin',
    email: 'lea@exemple.fr',
    phoneNumber: '06 12 34 56 78',
    roles: [ROLES[1]],
    status: { id: ACCOUNT_STATUS_IDS.Active, name: 'Active' },
    createdAt: '2026-11-01T10:00:00+01:00',
    ...extra,
  };
}
