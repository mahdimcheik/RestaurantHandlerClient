import {
  email,
  FieldTree,
  maxLength,
  minLength,
  required,
  SchemaPath,
  validate,
} from '@angular/forms/signals';

export const PASSWORD_MIN_LENGTH = 8;

const requiredMessage = $localize`:@@validation.required:Ce champ est obligatoire.`;

/** Champ texte obligatoire, 64 caractères au plus (limite de l'API pour les noms). */
export function nameRules(path: SchemaPath<string>): void {
  required(path, { message: requiredMessage });
  maxLength(path, 64, {
    message: $localize`:@@validation.maxLength64:64 caractères au maximum.`,
  });
}

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

export function requiredRule(path: SchemaPath<string>): void {
  required(path, { message: requiredMessage });
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

/** Place le focus sur le premier champ en erreur après une soumission refusée. */
export function focusFirstInvalid(tree: FieldTree<unknown>): void {
  tree().errorSummary()[0]?.fieldTree().focusBoundControl();
}
