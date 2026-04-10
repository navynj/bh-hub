import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * /order — Routes by role: office staff → /order/office, supplier → /order/supplier,
 * manager → /order/location. Employees see no-access messaging.
 */
export default async function OrderRedirectPage() {
  const session = await auth();
  const role = session?.user?.role;

  switch (role) {
    case 'admin':
    case 'office':
    case 'assistant':
      redirect('/order/office');
    case 'supplier':
      redirect('/order/supplier');
    case 'manager':
      redirect('/order/location');
    case 'employee':
    default:
      return (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          You do not have access to this section.
        </div>
      );
  }
}
