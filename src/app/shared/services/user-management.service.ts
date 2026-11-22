import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { UserDetails, UserManagementApi } from '../../core/api/generated';
import { unwrap } from './api-operators';

@Service()
export class UserManagementService {
  private readonly api = inject(UserManagementApi);

  setStatus(userId: string, statusId: string): Observable<UserDetails> {
    return this.api.usermanagementUsersUserIdStatusPatch({ userId, statusId }).pipe(unwrap());
  }
}
