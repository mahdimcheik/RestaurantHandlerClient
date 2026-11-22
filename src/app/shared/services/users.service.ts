import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FilterUsers,
  UserAdminDetails,
  UserCreate,
  UserDetails,
  UsersApi,
  UserUpdate,
} from '../../core/api/generated';
import { Page, unwrap, unwrapPage } from './api-operators';

@Service()
export class UsersService {
  private readonly api = inject(UsersApi);

  filter(body: FilterUsers): Observable<Page<UserAdminDetails>> {
    return this.api.usersFilterPost({ body }).pipe(unwrapPage());
  }

  get(id: string): Observable<UserDetails> {
    return this.api.usersIdGet({ id }).pipe(unwrap());
  }

  update(id: string, body: UserUpdate): Observable<UserDetails> {
    return this.api.usersIdPut({ id, body }).pipe(unwrap());
  }

  create(body: UserCreate): Observable<UserDetails> {
    return this.api.usersPost({ body }).pipe(unwrap());
  }
}
