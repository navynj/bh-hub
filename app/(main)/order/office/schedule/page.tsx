import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OfficeSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth');

  return (
    <div className="max-w-3xl space-y-2">
      <h1 className="text-lg font-semibold">Office — Schedule</h1>
      <p className="text-sm text-muted-foreground">
        Delivery and fulfillment scheduling will appear here.
      </p>
    </div>
  );
}
