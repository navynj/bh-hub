import { Separator } from '@/components/ui/separator';
import DashboardLinkList from './DashboardLinkList';
import LocationLinkList from './LocationLinkList';

const DashboardSideNav = () => {
  return (
    <nav className="h-6 flex flex-col max-sm:flex-row max-sm:flex-wrap max-sm:items-center gap-4 pb-2 mb-4 text-lg">
      {/* <DashboardLinkList />
      <Separator className="my-2 max-sm:hidden" /> */}
      <Separator className="mx-2 max-sm:block hidden" orientation="vertical" />
      <LocationLinkList />
    </nav>
  );
};

export default DashboardSideNav;
