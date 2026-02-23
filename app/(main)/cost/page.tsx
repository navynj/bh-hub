'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CostSummary {
  id: string;
  title: string;
  totalCount: number;
  lossAmount: number | null;
  finalWeight: number | null;
  locked: boolean;
  createdAt: string;
  tags: { id: string; name: string; color: string }[];
}

export default function CostPage() {
  const [costs, setCosts] = useState<CostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cost?pageSize=50')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch costs');
        return res.json();
      })
      .then((data) => {
        setCosts(data.costs ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading costs…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Cost Analysis</h1>
      <p className="text-muted-foreground mb-6">
        Costs are stored in the{' '}
        <code className="rounded bg-muted px-1">cost</code> schema. Use the API
        to create and edit.
      </p>
      {costs.length === 0 ? (
        <p className="text-muted-foreground">
          No costs yet. Create one via POST /api/cost.
        </p>
      ) : (
        <ul className="space-y-2">
          {costs.map((cost) => (
            <li
              key={cost.id}
              className="flex items-center gap-3 border rounded-lg p-3"
            >
              <span className="font-medium">{cost.title}</span>
              <span className="text-sm text-muted-foreground">
                count: {cost.totalCount}
                {cost.finalWeight != null && ` · ${cost.finalWeight}g each`}
              </span>
              {cost.locked && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  Locked
                </span>
              )}
              {cost.tags?.length > 0 && (
                <span className="flex gap-1">
                  {cost.tags.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `var(--${t.color}-100, #e5e7eb)`,
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                </span>
              )}
              <Link
                href={`/cost/edit/${cost.id}`}
                className="ml-auto text-sm text-primary hover:underline"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
