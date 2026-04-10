import OfficeOrderNav from '@/features/order/components/OfficeOrderNav';
import { PropsWithChildren } from 'react';

const OfficeOrderLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex max-sm:flex-col w-full gap-12 max-sm:gap-0">
      <OfficeOrderNav />
      <div className="min-w-0 w-full flex-1">{children}</div>
    </div>
  );
};

export default OfficeOrderLayout;
