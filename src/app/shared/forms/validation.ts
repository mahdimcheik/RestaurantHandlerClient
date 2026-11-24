import {
  email,
  FieldTree,
  minLength,
  maxLength,
  max,
  min,
  required,
  SchemaPath,
  validate,
} from '@angular/forms/signals';
import { parseEuros } from '../utils/money';

export const requiredMessage = 'Ce champ est obligatoire.';

export function requiredRule(path: SchemaPath<string>): void {
  required(path, { message: requiredMessage });
}

/** Champ texte obligatoire, 64 caractères au plus (limite de l'API pour les noms). */
export function nameRules(path: SchemaPath<string>, limit = 64): void {
  required(path, { message: requiredMessage });
  maxLength(path, limit, {
    message: `${limit} caractères au maximum.`,
  });
}

/** Texte facultatif borné (descriptions : 1 000 caractères pour l'API). */
export function lengthRule(path: SchemaPath<string>, limit: number): void {
  maxLength(path, limit, {
    message: `${limit} caractères au maximum.`,
  });
}

/** Montant en euros saisi en texte (« 12,50 »), positif ou nul ; vide accepté si facultatif. */
export function eurosRule(path: SchemaPath<string>, options: { required: boolean }): void {
  if (options.required) {
    required(path, { message: requiredMessage });
  }
  validate(path, ({ value }) =>
    value().trim() === '' || parseEuros(value()) !== null
      ? undefined
      : {
          kind: 'euros',
          message: 'Saisissez un montant positif, par exemple 12,50.',
        },
  );
}

/** Entier borné (nombre de choix d'un groupe). */
export function integerRange(path: SchemaPath<number>, low: number, high: number): void {
  min(path, low, { message: `${low} au minimum.` });
  max(path, high, { message: `${high} au maximum.` });
  validate(path, ({ value }) =>
    Number.isInteger(value())
      ? undefined
      : { kind: 'integer', message: 'Saisissez un nombre entier.' },
  );
}

/** Le maximum (`max`) doit être au moins égal au minimum (`min`) : bornes d'un nombre de choix. */
export function maxAtLeastMin(max: SchemaPath<number>, min: SchemaPath<number>): void {
  validate(max, ({ value, valueOf }) =>
    value() < valueOf(min)
      ? {
          kind: 'belowMin',
          message: 'Le maximum doit être au moins égal au minimum.',
        }
      : undefined,
  );
}

/** Place le focus sur le premier champ en erreur après une soumission refusée. */
export function focusFirstInvalid(tree: FieldTree<unknown>): void {
  tree().errorSummary()[0]?.fieldTree().focusBoundControl();
}

export const PASSWORD_MIN_LENGTH = 8;

/** Adresse e-mail valide, sans « + » (refusé par l'API). */
export function emailRules(path: SchemaPath<string>): void {
  required(path, { message: requiredMessage });
  email(path, {
    message: 'Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.',
  });
  validate(path, ({ value }) =>
    value().includes('+')
      ? {
          kind: 'noPlus',
          message: `L'adresse e-mail ne doit pas contenir de « + ».`,
        }
      : undefined,
  );
}

/** Nouveau mot de passe : longueur minimale imposée par l'API. */
export function newPasswordRules(path: SchemaPath<string>): void {
  required(path, { message: requiredMessage });
  minLength(path, PASSWORD_MIN_LENGTH, {
    message: `Au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  });
}

/** Case à cocher obligatoire (consentements). */
export function mustBeChecked(path: SchemaPath<boolean>, message: string): void {
  validate(path, ({ value }) => (value() ? undefined : { kind: 'unchecked', message }));
}
