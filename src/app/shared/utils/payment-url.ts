/** Adresse de paiement acceptée pour une redirection : absolue et chiffrée (page hébergée SumUp). */
export function isPaymentUrl(url: string | null | undefined): url is string {
  if (!url) {
    return false;
  }
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}
