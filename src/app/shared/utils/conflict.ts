import { HttpErrorResponse } from '@angular/common/http';

/** 409 : la commande a changé entre-temps (autre appareil, cuisine) ; il faut la relire. */
export function isConflict(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

export const CONFLICT_MESSAGE = $localize`:@@order.conflict:La commande a changé entre-temps : elle a été rechargée.`;
