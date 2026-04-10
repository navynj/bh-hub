import { getDefaultDashboardLocationId } from '@/lib/dashboard/default-location';
import { notFound, redirect } from 'next/navigation';

const DashboardPage = async () => {
  const id = await getDefaultDashboardLocationId();
  if (!id) {
    notFound();
  }
  redirect(`/dashboard/location/${id}`);
};

export default DashboardPage;
