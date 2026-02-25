'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function CostRedirectionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cost/list');
  }, [router]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
