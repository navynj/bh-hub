import type { IngredientApiResponse } from '@/features/cost/types/cost';

export type IngredientPayloadType = Omit<
  IngredientApiResponse,
  'image' | 'gPrice' | 'metadata' | 'unitPrice' | 'amountPrice'
> & { image?: unknown };
