import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { StatusTab } from '../types';

type Props = {
  tabs: { id: StatusTab; label: string; count: number }[];
  activeTab: StatusTab;
  onChange: (tab: StatusTab) => void;
  archivedCount?: number;
  showArchived?: boolean;
  onToggleArchived?: () => void;
};

export function StatusTabBar({
  tabs,
  activeTab,
  onChange,
  archivedCount = 0,
  showArchived = false,
  onToggleArchived,
}: Props) {
  return (
    <div className="flex items-center border-b bg-background flex-shrink-0 overflow-x-auto">
      {tabs.map((tab) => {
        const isOn = !showArchived && activeTab === tab.id;
        return (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            onClick={() => onChange(tab.id)}
            className={cn(
              'h-10 rounded-none px-3.5 text-[12px] font-normal border-b-2 -mb-px gap-1.5 hover:bg-transparent',
              isOn
                ? 'text-foreground font-medium border-foreground'
                : 'text-muted-foreground border-transparent hover:text-foreground',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-px rounded-full',
                isOn
                  ? 'bg-[#FAEEDA] text-[#633806]'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          </Button>
        );
      })}

      {onToggleArchived && (
        <button
          type="button"
          onClick={onToggleArchived}
          className={cn(
            'ml-auto flex items-center gap-1.5 h-10 px-3 text-[12px] border-b-2 -mb-px transition-colors',
            showArchived
              ? 'text-foreground font-medium border-foreground'
              : 'text-muted-foreground border-transparent hover:text-foreground',
          )}
          title={showArchived ? 'Hide archived' : 'Show archived'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="5" x="2" y="3" rx="1" />
            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
          </svg>
          {archivedCount > 0 && (
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-px rounded-full',
                showArchived
                  ? 'bg-[#FAEEDA] text-[#633806]'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {archivedCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
