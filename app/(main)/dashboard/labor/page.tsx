import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const LaborPage = async () => {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth');
  }

  const managerLocationId = session.user.locationId ?? undefined;
  if (!getOfficeOrAdmin(session.user.role) && managerLocationId) {
    redirect(`/dashboard/location/${managerLocationId}`);
  }

  const locations = await prisma.location.findMany({
    where: { showBudget: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Labor</h1>
      <p className="text-muted-foreground text-sm max-w-lg">
        Labor-related Cost of Sales lines (payroll, wages, etc.) are summed on
        each location&apos;s dashboard.
      </p>
      <ul className="flex flex-col gap-2 pt-2">
        {locations.map((loc) => (
          <li key={loc.id}>
            <Link
              href={`/dashboard/location/${loc.id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {loc.code}
              {loc.name ? ` — ${loc.name}` : ''}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LaborPage;
