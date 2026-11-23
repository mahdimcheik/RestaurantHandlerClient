import { Injectable } from '@angular/core';
import { Cart } from '../../../shared/ordering/cart';

/** Panier de la saisie comptoir, propre à l'écran (non conservé). */
@Injectable()
export class CounterCart extends Cart {}
