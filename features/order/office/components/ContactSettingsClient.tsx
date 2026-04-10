'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ChannelType = 'email' | 'sms' | 'whatsapp';

type SenderAccount = {
  id: string;
  channel: ChannelType;
  label: string;
  address: string;
  isDefault: boolean;
};

const CHANNEL_META: Record<
  ChannelType,
  { label: string; badge: 'blue' | 'green' | 'purple'; placeholder: string }
> = {
  email: {
    label: 'Email',
    badge: 'blue',
    placeholder: 'orders@company.com',
  },
  sms: {
    label: 'SMS',
    badge: 'green',
    placeholder: '+1 604-000-0000',
  },
  whatsapp: {
    label: 'WhatsApp',
    badge: 'purple',
    placeholder: '+1 604-000-0000',
  },
};

const EMPTY_FORM = {
  channel: 'email' as ChannelType,
  label: '',
  address: '',
};

export function ContactSettingsClient() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(account: SenderAccount) {
    setEditingId(account.id);
    setForm({
      channel: account.channel,
      label: account.label,
      address: account.address,
    });
    setShowForm(true);
  }

  function handleSave() {
    if (!form.label.trim() || !form.address.trim()) return;

    if (editingId) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? { ...a, channel: form.channel, label: form.label.trim(), address: form.address.trim() }
            : a,
        ),
      );
    } else {
      const newAccount: SenderAccount = {
        id: crypto.randomUUID(),
        channel: form.channel,
        label: form.label.trim(),
        address: form.address.trim(),
        isDefault: accounts.length === 0,
      };
      setAccounts((prev) => [...prev, newAccount]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleDelete(id: string) {
    setAccounts((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
    if (editingId === id) {
      setShowForm(false);
      setEditingId(null);
    }
  }

  function setDefault(id: string) {
    setAccounts((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  }

  const meta = CHANNEL_META[form.channel];

  return (
    <div className="space-y-4">
      {/* Notice */}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          This is a placeholder UI. Sender accounts are stored locally in this
          session and will not persist. Backend integration is coming soon.
        </p>
      </div>

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Sender Accounts ({accounts.length})
        </h2>
        <Button size="sm" className="text-xs" onClick={openNew}>
          + Add Account
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border bg-background p-4 space-y-3">
          <h3 className="text-sm font-medium">
            {editingId ? 'Edit Account' : 'New Sender Account'}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cs-channel" className="text-xs">
                Channel
              </Label>
              <Select
                value={form.channel}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, channel: v as ChannelType }))
                }
              >
                <SelectTrigger
                  id="cs-channel"
                  className="h-auto min-h-0 text-sm px-2 py-1.5"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cs-label" className="text-xs">
                Label
              </Label>
              <Input
                id="cs-label"
                className="h-auto min-h-0 text-sm px-2 py-1.5"
                placeholder="e.g. Main Office"
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cs-address" className="text-xs">
                {form.channel === 'email' ? 'Email Address' : 'Phone Number'}
              </Label>
              <Input
                id="cs-address"
                className="h-auto min-h-0 text-sm px-2 py-1.5"
                placeholder={meta.placeholder}
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="xs" className="text-xs" onClick={handleSave}>
              {editingId ? 'Update' : 'Add'}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-xs"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sender accounts configured yet. Add an email, SMS, or WhatsApp
          account to start sending order communications.
        </p>
      ) : (
        <div className="relative w-full overflow-auto rounded-md border">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                {['Channel', 'Label', 'Address', 'Default', ''].map((h) => (
                  <th
                    key={h}
                    className="h-9 px-2 text-left align-middle text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {accounts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => openEdit(a)}
                >
                  <td className="p-2 align-middle">
                    <Badge
                      variant={CHANNEL_META[a.channel].badge}
                      className="rounded px-1.5 text-[10px]"
                    >
                      {CHANNEL_META[a.channel].label}
                    </Badge>
                  </td>
                  <td className="p-2 align-middle font-medium">{a.label}</td>
                  <td className="p-2 align-middle text-xs text-muted-foreground">
                    {a.address}
                  </td>
                  <td className="p-2 align-middle">
                    {a.isDefault ? (
                      <Badge
                        variant="green"
                        className="rounded px-1.5 text-[10px]"
                      >
                        Default
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefault(a.id);
                        }}
                      >
                        Set Default
                      </Button>
                    )}
                  </td>
                  <td className="p-2 align-middle">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(a);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-[10px] text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(a.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
