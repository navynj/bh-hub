/**
 * `@shopify/admin-api-client` `client.request()` returns GraphQL failures as
 * `errors: { message, graphQLErrors?: [...] }` — not a top-level array.
 */
export function formatShopifyAdminClientErrors(errors: unknown): string {
  if (errors == null || errors === false) return '';

  if (Array.isArray(errors)) {
    return errors
      .map((item) => {
        if (item && typeof item === 'object' && 'message' in item) {
          const m = String((item as { message: unknown }).message);
          const code = (item as { extensions?: { code?: string } }).extensions
            ?.code;
          return code ? `${m} [${code}]` : m;
        }
        return String(item);
      })
      .filter(Boolean)
      .join(' | ');
  }

  if (typeof errors === 'object') {
    const o = errors as Record<string, unknown>;
    const gqlRaw = o.graphQLErrors;
    const gqlPart =
      gqlRaw != null && gqlRaw !== false
        ? formatShopifyAdminClientErrors(gqlRaw as unknown[])
        : '';
    const msg =
      typeof o.message === 'string' && o.message.length > 0 ? o.message : '';

    if (gqlPart) {
      const generic =
        msg.includes('graphQLErrors') ||
        msg.includes('An error occurred while fetching from the API');
      return generic || !msg.trim() ? gqlPart : `${gqlPart} (${msg})`;
    }
    return msg;
  }

  return String(errors);
}
