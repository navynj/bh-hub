import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OfficeDataSyncClient } from '@/features/order/office/components/OfficeDataSyncClient';

export const dynamic = 'force-dynamic';

export default async function OfficeOrderSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth');

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">Office — Data & Sync</h1>
      <OfficeDataSyncClient />
    </div>
  );
}
