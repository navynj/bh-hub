export interface ItemChange {
  type: 'added' | 'deleted' | 'modified';
  itemType: string;
  item: { title: string; id: string };
  changes?: Record<string, { from: unknown; to: unknown }>;
}

interface ComparableItem {
  id: string;
  title?: string;
  [key: string]: unknown;
}

export function compareItems(
  prevItems: ComparableItem[],
  payloadItems: ComparableItem[] | undefined,
  itemType: string
): ItemChange[] {
  const changes: ItemChange[] = [];
  const prevIds = new Set(prevItems.map((item) => item.id));
  const payloadIds = new Set((payloadItems || []).map((item) => item.id));

  for (const payloadItem of payloadItems || []) {
    if (!prevIds.has(payloadItem.id)) {
      changes.push({
        type: 'added',
        itemType,
        item: {
          title: (payloadItem.title as string) || payloadItem.id,
          id: payloadItem.id,
        },
      });
    }
  }

  for (const prevItem of prevItems) {
    if (!payloadIds.has(prevItem.id)) {
      changes.push({
        type: 'deleted',
        itemType,
        item: {
          title: (prevItem.title as string) || prevItem.id,
          id: prevItem.id,
        },
      });
    }
  }

  return changes;
}
