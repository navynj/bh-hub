/**
 * Clover REST API config.
 * Credentials (token + merchant ID) are stored per-location in the database.
 */

export function getCloverApiBaseUrl(): string {
  return process.env.CLOVER_API_BASE_URL?.trim() || 'https://api.clover.com';
}
