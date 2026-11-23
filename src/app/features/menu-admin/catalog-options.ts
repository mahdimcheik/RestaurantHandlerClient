import { SelectOption } from '../../shared/ui/select-field/select-field';

/** Taux de TVA acceptés par l'API (liste fermée, conformité fiscale). */
export const VAT_RATES: readonly SelectOption[] = [
  { value: '5.5', label: '5,5 %' },
  { value: '10', label: '10 %' },
  { value: '20', label: '20 %' },
];
