import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OrderManagementView } from '@/features/order/office/OrderManagementView';

export const dynamic = 'force-dynamic';

export default async function OfficeOrderInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth');

  return <OrderManagementView />;
}
