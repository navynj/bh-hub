'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import {
  COMM_MODES,
  COMM_TABS,
  type CommTab,
  type CommMode,
  type SupplierEntry,
} from '../types';

type Props = { entry: SupplierEntry };

export function CommPanel({ entry }: Props) {
  const [activeTab, setActiveTab] = useState<CommTab>('customer');
  const [supMode, setSupMode] = useState<CommMode>('email');

  return (
    <div className="w-[248px] flex-shrink-0 border-l bg-background flex flex-col">
      {/* Tab strip */}
      <div className="flex border-b flex-shrink-0">
        {COMM_TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 rounded-none py-2 text-[11px] font-medium border-b-2 -mb-px capitalize hover:bg-transparent',
              activeTab === tab
                ? 'text-foreground border-foreground'
                : 'text-muted-foreground border-transparent hover:text-foreground',
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === 'customer' ? (
        <CustomerComm />
      ) : (
        <SupplierComm
          entry={entry}
          supMode={supMode}
          onModeChange={setSupMode}
        />
      )}
    </div>
  );
}

// ─── Customer tab ─────────────────────────────────────────────────────────────

function CustomerComm() {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-[6px] border-b bg-muted/30 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">
          C Market HQ · hq@cmarket.ca
        </span>
        <Badge variant="purple" className="rounded px-1.5 text-[9px]">
          2 unread
        </Badge>
      </div>
      <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
        <Bubble from="customer" sender="C Market HQ" time="Apr 5, 14:22">
          Can you confirm #5362 arrives Thursday morning?
        </Bubble>
        <Bubble from="outbound" sender="Yoonji Lee" time="Apr 5, 14:45">
          Yes, confirmed for Thursday morning.
        </Bubble>
        <Bubble from="customer" sender="C Market HQ" time="Apr 6, 09:10">
          Can we add 1 more E0224 to #5363?
        </Bubble>
        <Bubble from="customer" sender="C Market HQ" time="Apr 6, 09:11">
          Also can billing address be updated?
        </Bubble>
      </div>
      <CommFooter
        placeholder="Reply to customer…"
        hint="via hub chat"
        sendLabel="Send"
      />
    </>
  );
}

// ─── Supplier tab ─────────────────────────────────────────────────────────────

function SupplierComm({
  entry,
  supMode,
  onModeChange,
}: {
  entry: SupplierEntry;
  supMode: CommMode;
  onModeChange: (m: CommMode) => void;
}) {
  const hasContact = entry.hasEmail || entry.hasChat || entry.hasSms;

  if (!hasContact) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-7 text-center flex-1">
        <NoEmailIcon />
        <div className="text-[12px] font-medium text-muted-foreground">
          No contact method
        </div>
        <div className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Add contact info in supplier settings.
        </div>
        <Button
          variant="outline"
          size="xs"
          className="text-[10px] rounded-[5px]"
        >
          Supplier settings
        </Button>
      </div>
    );
  }

  const available: CommMode[] = COMM_MODES.filter(
    (m) => {
      if (m === 'email') return entry.hasEmail;
      if (m === 'chat') return entry.hasChat;
      if (m === 'sms') return entry.hasSms;
      return false;
    },
  );

  const activeMode = available.includes(supMode) ? supMode : available[0];

  return (
    <>
      {/* Mode selector */}
      <div className="flex items-center gap-1 px-2.5 py-[5px] border-b flex-shrink-0">
        <span className="text-[10px] text-muted-foreground mr-1">Via</span>
        {COMM_MODES.map((m) => {
          const enabled = available.includes(m);
          return (
            <Button
              key={m}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => enabled && onModeChange(m)}
              disabled={!enabled}
              className={cn(
                'h-auto min-h-0 text-[10px] px-2 py-[2px] rounded-[5px] capitalize font-normal',
                activeMode === m &&
                  'bg-foreground text-background border-transparent hover:bg-foreground/90 hover:text-background',
                activeMode !== m &&
                  'border-border text-muted-foreground bg-background hover:bg-muted',
              )}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Button>
          );
        })}
      </div>

      {activeMode === 'email' && <EmailConv entry={entry} />}
      {activeMode === 'chat' && <ChatConv entry={entry} />}
      {activeMode === 'sms' && <SmsConv entry={entry} />}
    </>
  );
}

// ─── Conversation views ───────────────────────────────────────────────────────

function EmailConv({ entry }: { entry: SupplierEntry }) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-[6px] border-b bg-muted/30 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {entry.supplierContactEmail}
        </span>
        <Badge variant="blue" className="rounded px-1.5 text-[9px]">
          1 unread
        </Badge>
      </div>
      <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
        <Bubble from="outbound" sender="BH Hub (auto-sent)" time="Apr 5, 09:02">
          Hi {entry.supplierCompany}, PO attached. Please confirm receipt.
        </Bubble>
        <Bubble
          from="email"
          sender={`${entry.supplierCompany} Supplier`}
          time="Apr 5, 10:45"
        >
          #5362 ready. #5363 delayed — Apr 8.
        </Bubble>
        <Bubble from="outbound" sender="Yoonji Lee" time="Apr 5, 11:10">
          Ensure #5363 arrives before noon Apr 8.
        </Bubble>
      </div>
      <CommFooter
        placeholder="Reply via email…"
        hint="via hub@bh.ca"
        sendLabel="Send email"
      />
    </>
  );
}

function ChatConv({ entry }: { entry: SupplierEntry }) {
  return (
    <>
      <div className="px-3 py-[6px] border-b bg-muted/30 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {entry.supplierCompany} · Hub chat
        </span>
      </div>
      <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
        <Bubble from="chat" sender={entry.supplierCompany} time="Apr 5, 11:00">
          Truck might be 30 min late Thursday.
        </Bubble>
        <Bubble from="outbound" sender="Yoonji Lee" time="Apr 5, 11:05">
          No problem, thanks!
        </Bubble>
      </div>
      <CommFooter
        placeholder="Chat message…"
        hint="Hub chat"
        sendLabel="Send"
      />
    </>
  );
}

function SmsConv({ entry }: { entry: SupplierEntry }) {
  return (
    <>
      <div className="px-3 py-[6px] border-b bg-muted/30 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {entry.supplierCompany} · +1 604 555 0192
        </span>
      </div>
      <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
        <Bubble from="sms" sender={entry.supplierCompany} time="Apr 5, 08:55">
          Confirm delivery address for #5363?
        </Bubble>
        <Bubble from="outbound" sender="Hub (SMS)" time="Apr 5, 09:00">
          456 Oak Ave, Burnaby.
        </Bubble>
      </div>
      <CommFooter placeholder="SMS…" hint="via SMS" sendLabel="Send SMS" />
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function CommFooter({
  placeholder,
  hint,
  sendLabel,
}: {
  placeholder: string;
  hint: string;
  sendLabel: string;
}) {
  return (
    <div className="p-2.5 border-t flex-shrink-0">
      <Textarea
        className="min-h-11 h-11 resize-none text-[11px] p-1.5 rounded-[5px] md:text-[11px]"
        placeholder={placeholder}
      />
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[10px] text-muted-foreground">{hint}</span>
        <Button size="xs" className="text-[10px] rounded-[5px]">
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}

type BubbleFrom = 'customer' | 'outbound' | 'email' | 'chat' | 'sms';

const BUBBLE_STYLES: Record<BubbleFrom, { wrap: string; name: string }> = {
  outbound: {
    wrap: 'bg-muted/80 border border-border',
    name: 'text-muted-foreground',
  },
  customer: {
    wrap: 'bg-[#EEEDFE] border border-[#AFA9EC]',
    name: 'text-[#3C3489]',
  },
  email: {
    wrap: 'bg-[#E6F1FB] border border-[#B5D4F4]',
    name: 'text-[#0C447C]',
  },
  chat: {
    wrap: 'bg-[#FAEEDA] border border-[#FAC775]',
    name: 'text-[#633806]',
  },
  sms: { wrap: 'bg-[#EAF3DE] border border-[#C0DD97]', name: 'text-[#27500A]' },
};

function Bubble({
  from,
  sender,
  time,
  children,
}: {
  from: BubbleFrom;
  sender: string;
  time: string;
  children: React.ReactNode;
}) {
  const s = BUBBLE_STYLES[from];
  return (
    <div className={cn('p-2 rounded-lg text-[11px]', s.wrap)}>
      <div className={cn('text-[10px] font-medium mb-0.5', s.name)}>
        {sender}
        <span className="font-normal text-muted-foreground ml-1">{time}</span>
      </div>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function NoEmailIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      className="text-muted-foreground/40"
    >
      <rect
        x="2"
        y="6"
        width="22"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M2 9l11 7 11-7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
