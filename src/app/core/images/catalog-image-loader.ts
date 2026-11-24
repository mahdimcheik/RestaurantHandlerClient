import { ImageLoaderConfig } from '@angular/common';

/**
 * Tailles de chaque photo de la carte, produites à l'envoi par l'API
 * (`CatalogImageService.Widths`) : les deux listes doivent rester identiques.
 */
export const CATALOG_IMAGE_WIDTHS = [160, 320, 640, 1200];

const VARIANT_SUFFIX = /-w\d+\.webp$/;

/**
 * Loader de `NgOptimizedImage` : une photo multi-tailles (`…-w1200.webp`) est servie dans la plus
 * petite taille qui couvre la largeur demandée par le `srcset`. Toute autre URL (photos envoyées
 * avant les variantes, images statiques) est rendue telle quelle.
 */
export function catalogImageLoader({ src, width }: ImageLoaderConfig): string {
  if (!width || !VARIANT_SUFFIX.test(src)) {
    return src;
  }
  const size =
    CATALOG_IMAGE_WIDTHS.find((candidate) => candidate >= width) ?? CATALOG_IMAGE_WIDTHS.at(-1);
  return src.replace(VARIANT_SUFFIX, `-w${size}.webp`);
}
