'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SupplierGroup = {
  id: string;
  name: string;
  slug: string;
  _count: { suppliers: number };
};

export type VendorMappingRow = { id: string; vendorName: string };

export type SupplierRow = {
  id: string;
  company: string;
  shopifyVendorName: string | null;
  groupId: string | null;
  group: { name: string; slug: string } | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  preferredCommMode: string | null;
  isFavorite: boolean;
  link: string | null;
  notes: string | null;
  createdAt: string;
  vendorMappings: VendorMappingRow[];
  _count: { purchaseOrders: number };
};

type Props = {
  editing: SupplierRow | null;
  prefillVendor: string | null;
  vendors: string[];
  groups: SupplierGroup[];
  defaultGroupId?: string | null;
  onDone: () => void;
};

const COMM_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Chat' },
  { value: 'sms', label: 'SMS' },
] as const;

const NONE_VALUE = '__none__';

export function SupplierForm({
  editing,
  prefillVendor,
  vendors,
  groups,
  defaultGroupId,
  onDone,
}: Props) {
  const isEdit = editing !== null;
  const [isPending, startTransition] = useTransition();

  const [company, setCompany] = useState(
    editing?.company ?? prefillVendor ?? '',
  );
  const [shopifyVendorName, setShopifyVendorName] = useState(
    editing?.shopifyVendorName ?? prefillVendor ?? '',
  );
  const [groupId, setGroupId] = useState(
    editing?.groupId ?? defaultGroupId ?? '',
  );
  const [contactName, setContactName] = useState(editing?.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(
    editing?.contactEmail ?? '',
  );
  const [contactPhone, setContactPhone] = useState(
    editing?.contactPhone ?? '',
  );
  const [preferredCommMode, setPreferredCommMode] = useState(
    editing?.preferredCommMode ?? '',
  );
  const [link, setLink] = useState(editing?.link ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const [vendorAliases, setVendorAliases] = useState<string[]>(
    editing?.vendorMappings.map((m) => m.vendorName) ?? [],
  );
  const [newAlias, setNewAlias] = useState('');

  function addAlias() {
    const trimmed = newAlias.trim();
    if (!trimmed || vendorAliases.includes(trimmed)) return;
    setVendorAliases((prev) => [...prev, trimmed]);
    setNewAlias('');
  }

  function removeAlias(name: string) {
    setVendorAliases((prev) => prev.filter((a) => a !== name));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const body = {
        company: company.trim(),
        shopifyVendorName: shopifyVendorName.trim() || null,
        groupId: groupId || null,
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        preferredCommMode: preferredCommMode || null,
        link: link.trim() || null,
        notes: notes.trim() || null,
        vendorAliases,
      };

      const url = isEdit ? `/api/suppliers/${editing.id}` : '/api/suppliers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Failed (${res.status})`);
        return;
      }

      onDone();
    });
  }

  const fieldCls =
    'h-auto min-h-0 text-sm px-2 py-1.5 rounded-md md:text-sm';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold">
        {isEdit ? 'Edit Supplier' : 'Create Supplier'}
      </h3>

      {error && (
        <p className="text-sm text-destructive rounded bg-destructive/10 px-2 py-1">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="sf-company" className="text-xs">
            Company *
          </Label>
          <Input
            id="sf-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className={fieldCls}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sf-group" className="text-xs">
            Group
          </Label>
          <Select
            value={groupId || NONE_VALUE}
            onValueChange={(v) => setGroupId(v === NONE_VALUE ? '' : v)}
          >
            <SelectTrigger
              id="sf-group"
              className="h-auto min-h-0 text-sm px-2 py-1.5"
            >
              <SelectValue placeholder="Select group..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>
                <span className="text-muted-foreground">None</span>
              </SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sf-vendor" className="text-xs">
          Shopify Vendor
        </Label>
        <Select
          value={shopifyVendorName || NONE_VALUE}
          onValueChange={(v) =>
            setShopifyVendorName(v === NONE_VALUE ? '' : v)
          }
        >
          <SelectTrigger
            id="sf-vendor"
            className="h-auto min-h-0 text-sm px-2 py-1.5"
          >
            <SelectValue placeholder="Select vendor..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isEdit && (
        <div className="grid gap-2">
          <Label className="text-xs">Vendor Aliases</Label>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Map multiple Shopify vendor names to this supplier (handles renames).
          </p>
          {vendorAliases.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {vendorAliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                >
                  {alias}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-[10px] leading-none cursor-pointer"
                    onClick={() => removeAlias(alias)}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <Input
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="Add vendor name alias..."
              className={fieldCls}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAlias();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs shrink-0"
              onClick={addAlias}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="sf-name" className="text-xs">
            Contact Name
          </Label>
          <Input
            id="sf-name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={fieldCls}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sf-email" className="text-xs">
            Contact Email
          </Label>
          <Input
            id="sf-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={fieldCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="sf-phone" className="text-xs">
            Contact Phone
          </Label>
          <Input
            id="sf-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className={fieldCls}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sf-comm" className="text-xs">
            Preferred Comm
          </Label>
          <Select
            value={preferredCommMode}
            onValueChange={setPreferredCommMode}
          >
            <SelectTrigger
              id="sf-comm"
              className="h-auto min-h-0 text-sm px-2 py-1.5"
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {COMM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sf-link" className="text-xs">
          Order Link
        </Label>
        <Input
          id="sf-link"
          type="url"
          placeholder="https://supplier-site.com/order"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={fieldCls}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sf-notes" className="text-xs">
          Notes
        </Label>
        <Textarea
          id="sf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-16 resize-none text-sm px-2 py-1.5 md:text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDone}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
