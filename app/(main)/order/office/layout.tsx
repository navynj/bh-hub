import { PropsWithChildren } from 'react';
import { OfficeSettingsBar } from '@/features/order/office/components/OfficeSettingsBar';

const OfficeOrderLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="relative">
      <OfficeSettingsBar />
      {children}
    </div>
  );
};

export default OfficeOrderLayout;
