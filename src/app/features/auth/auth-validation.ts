import { email, minLength, required, SchemaPath, validate } from '@angular/forms/signals';
import { requiredMessage } from '../../shared/forms/validation';

export { focusFirstInvalid, nameRules, requiredRule } from '../../shared/forms/validation';

export const PASSWORD_MIN_LENGTH = 8;

/** Adresse e-mail valide, sans « + » (refusé par l'API). */
export function emailRules(path: SchemaPath<string>): void {
  required(path, { message: requiredMessage });
  email(path, {
    message: $localize`:@@validation.email:Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.`,
  });
  validate(path, ({ value }) =>
    value().includes('+')
      ? {
          kind: 'noPlus',
          message: $localize`:@@validation.noPlus:L'adresse e-mail ne doit pas contenir de « + ».`,
        }
      : undefined,
  );
}

/** Nouveau mot de passe : longueur minimale imposée par l'API. */
export function newPasswordRules(path: SchemaPath<string>): void {
  required(path, { message: requiredMessage });
  minLength(path, PASSWORD_MIN_LENGTH, {
    message: $localize`:@@validation.passwordLength:Au moins ${PASSWORD_MIN_LENGTH}:min: caractères.`,
  });
}

/** Case à cocher obligatoire (consentements). */
export function mustBeChecked(path: SchemaPath<boolean>, message: string): void {
  validate(path, ({ value }) => (value() ? undefined : { kind: 'unchecked', message }));
}
