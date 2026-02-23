'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CostEditPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="p-6">
      <Link href="/cost" className="text-sm text-muted-foreground hover:underline mb-4 block">
        ← Back to Cost list
      </Link>
      <h1 className="text-2xl font-semibold">Edit cost</h1>
      <p className="text-muted-foreground mt-2">
        Cost ID: <code className="rounded bg-muted px-1">{id}</code>
      </p>
      <p className="text-muted-foreground mt-4">
        Use GET/PUT <code className="rounded bg-muted px-1">/api/cost/{id}</code> for data. To add the full cost editor UI (ingredients, prices, tags, etc.), copy the cost editor from <code className="rounded bg-muted px-1">bh-cost-analysis</code> and point it at <code className="rounded bg-muted px-1">/api/cost</code>.
      </p>
    </div>
  );
}
