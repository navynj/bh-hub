import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/core/prisma';
import { getTranslations } from 'next-intl/server';

const CostListPage = async () => {
  const t = await getTranslations();

  const costs = await prisma.cost.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      ingredients: true,
      packagings: true,
      labors: true,
      others: true,
      prices: true,
    },
  });

  return (
    <div className="w-full">
      <div className="flex gap-4 w-full justify-between max-sm:justify-end">
        <h3 className="text-3xl max-sm:text-2xl font-extrabold max-sm:hidden">
          {t('Cost.costs')}
        </h3>
        <Button href="/cost/edit">{'+ ' + t('Cost.calculateCost')}</Button>
      </div>
      <div>Work in progress...</div>
    </div>
  );
};

export default CostListPage;
