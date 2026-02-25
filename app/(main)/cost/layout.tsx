import CostNav from '@/features/cost/components/layout/CostNav';
import { PropsWithChildren } from 'react';

const CostLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex max-sm:flex-col w-full gap-12 max-sm:gap-0">
      <CostNav />
      <div className="max-w-6xl w-full mx-auto max-sm:w-full px-4">
        {children}
      </div>
    </div>
  );
};

export default CostLayout;
