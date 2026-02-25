import * as React from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from '@/lib/utils';
import { Droppable } from './drag-and-drop';
import { Dispatch, SetStateAction } from 'react';
import { DragEndEvent } from '@dnd-kit/core';

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const ScrollableTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { bodyMaxHeight?: string }
>(({ className, bodyMaxHeight = '540px', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('relative w-full overflow-auto', className)}
      {...props}
      style={{ maxHeight: bodyMaxHeight }}
    >
      <table className="w-full caption-bottom text-sm table-auto">
        {children}
      </table>
    </div>
  );
});
ScrollableTable.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'sticky bg-background top-0 z-10 [&_tr]:border-b rounded-md',
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

interface DroppableTableBodyProps<T extends { id: string }> extends Omit<
  React.HTMLAttributes<HTMLTableSectionElement>,
  'onDragEnd'
> {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  onDragEnd: (event: DragEndEvent) => void;
}

function DroppableTableBodyComponent<T extends { id: string }>(
  props: DroppableTableBodyProps<T>,
  ref: React.ForwardedRef<HTMLTableSectionElement>,
) {
  const { className, items, setItems, onDragEnd, ...restProps } = props;
  return (
    <Droppable
      items={items}
      setItems={setItems}
      onDragEnd={onDragEnd}
      skipDndContext={true}
    >
      <TableBody ref={ref} className={cn(className)} {...restProps} />
    </Droppable>
  );
}

const DroppableTableBodyBase = React.forwardRef(DroppableTableBodyComponent);
(DroppableTableBodyBase as any).displayName = 'DroppableTableBody';

const DroppableTableBody = DroppableTableBodyBase as <T extends { id: string }>(
  props: DroppableTableBodyProps<T> & {
    ref?: React.ForwardedRef<HTMLTableSectionElement>;
  },
) => React.ReactElement;

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

interface DraggableTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  id: string;
  showHandle?: boolean;
}

const DraggableTableRow = React.forwardRef<
  HTMLTableRowElement,
  DraggableTableRowProps
>(({ className, id, showHandle = true, children, ...props }, ref) => {
  const handleRef = React.useRef<HTMLDivElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Merge refs for the row
  const rowRef = React.useCallback(
    (node: HTMLTableRowElement | null) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref, setNodeRef],
  );

  return (
    <TableRow
      ref={rowRef}
      className={cn(className, isDragging && 'opacity-50')}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...props}
    >
      {showHandle && (
        <TableCell className="w-8 p-0">
          <div
            ref={handleRef}
            className="flex items-center justify-center h-full cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </div>
        </TableCell>
      )}
      {children}
    </TableRow>
  );
});
DraggableTableRow.displayName = 'DraggableTableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-2 text-left align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  ScrollableTable,
  DroppableTableBody,
  DraggableTableRow,
};
