import { Component, computed, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MANAGER_ROLE } from '../../../../core/auth/session.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  emailRules,
  focusFirstInvalid,
  mustBeChecked,
  nameRules,
  newPasswordRules,
  PASSWORD_MIN_LENGTH,
} from '../../../../shared/forms/validation';
import { StoreService } from '../../../../shared/services/store.service';
import { UsersService } from '../../../../shared/services/users.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';

/**
 * Création d'un compte Manager par un Manager (US-E10-2). Le compte créé est « en attente »
 * jusqu'à son activation depuis sa fiche.
 */
@Component({
  selector: 'app-user-create-page',
  host: { class: 'page' },
  imports: [RouterLink, TextField, CheckboxField],
  templateUrl: './user-create-page.html',
})
export class UserCreatePage {
  private readonly users = inject(UsersService);
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);

  private readonly model = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    consents: false,
  });
  protected readonly form = form(this.model, (path) => {
    nameRules(path.firstName);
    nameRules(path.lastName);
    emailRules(path.email);
    newPasswordRules(path.password);
    mustBeChecked(
      path.consents,
      'Confirmez que la personne a accepté la politique de confidentialité et le traitement de ses données.',
    );
  });

  protected readonly managerRoleId = computed(
    () => this.store.roles.value().find((role) => role.name === MANAGER_ROLE)?.id ?? null,
  );
  protected readonly passwordHint = `Au moins ${PASSWORD_MIN_LENGTH} caractères, à transmettre à la personne.`;
  protected readonly error = signal('');

  constructor() {
    this.store.roles.load();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    const roleId = this.managerRoleId();
    if (!roleId) {
      this.error.set('Le rôle Manager est introuvable. Rechargez la page.');
      return;
    }
    await submit(this.form, {
      action: async () => {
        const { firstName, lastName, email, password, consents } = this.model();
        try {
          const created = await firstValueFrom(
            this.users.create({
              firstName,
              lastName,
              email,
              password,
              roleId,
              privacyPolicyConsent: consents,
              dataProcessingConsent: consents,
            }),
          );
          void this.router.navigate(['/gestion/utilisateurs', created.id]);
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }
}
