/**
 * Coordonnées du site que l'API ne fournit pas (contact, pages légales). Un champ vide n'est pas
 * renseigné : la carte de contact correspondante est masquée et les pages légales affichent
 * « À compléter ». À remplir avant la mise en ligne.
 */
export const SITE_DETAILS = {
  /** Contact et exercice des droits sur les données personnelles. */
  email: '',
  instagramUrl: '',
  publicationDirector: '',
  host: { name: '', address: '', phone: '' },
  /** Date de dernière mise à jour des pages légales, affichée telle quelle. */
  legalUpdatedOn: '24 novembre 2026',
};
