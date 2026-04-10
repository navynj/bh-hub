import { NextRequest, NextResponse } from 'next/server';
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { parseBody, supplierUpdateSchema } from '@/lib/api/schemas';
import { toApiErrorResponse } from '@/lib/core/errors';
import { resolveSupplierGroupId } from '@/lib/order/default-supplier-group';

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id || !getOfficeOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Office or admin access required' },
        { status: 403 },
      );
    }

    const { id } = await ctx.params;
    const result = await parseBody(request, supplierUpdateSchema);
    if ('error' in result) return result.error;
    const { data } = result;

    const resolvedGroupId =
      data.groupId !== undefined
        ? await resolveSupplierGroupId(prisma, data.groupId)
        : undefined;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.company !== undefined && { company: data.company }),
        ...(data.shopifyVendorName !== undefined && {
          shopifyVendorName: data.shopifyVendorName ?? null,
        }),
        ...(data.contactName !== undefined && {
          contactName: data.contactName ?? null,
        }),
        ...(data.contactEmail !== undefined && {
          contactEmail: data.contactEmail ?? null,
        }),
        ...(data.contactPhone !== undefined && {
          contactPhone: data.contactPhone ?? null,
        }),
        ...(data.preferredCommMode !== undefined && {
          preferredCommMode: data.preferredCommMode ?? null,
        }),
        ...(data.groupId !== undefined && { groupId: resolvedGroupId }),
        ...(data.link !== undefined && { link: data.link ?? null }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
      },
    });

    // Auto-create/update vendor mapping for shopifyVendorName
    if (data.shopifyVendorName !== undefined && data.shopifyVendorName) {
      await prisma.shopifyVendorMapping.upsert({
        where: { vendorName: data.shopifyVendorName },
        create: {
          vendorName: data.shopifyVendorName,
          supplierId: id,
        },
        update: { supplierId: id },
      });
    }

    // Sync vendor alias mappings when provided
    if (data.vendorAliases !== undefined) {
      const desiredAliases = new Set(data.vendorAliases ?? []);

      // Delete mappings for this supplier that are no longer in the desired set
      await prisma.shopifyVendorMapping.deleteMany({
        where: {
          supplierId: id,
          vendorName: { notIn: [...desiredAliases] },
        },
      });

      // Upsert all desired aliases
      for (const alias of desiredAliases) {
        await prisma.shopifyVendorMapping.upsert({
          where: { vendorName: alias },
          create: { vendorName: alias, supplierId: id },
          update: { supplierId: id },
        });
      }
    }

    return NextResponse.json({ ok: true, supplier });
  } catch (err: unknown) {
    return toApiErrorResponse(err, 'PUT /api/suppliers/[id] error:');
  }
}

export async function PATCH(_request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id || !getOfficeOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Office or admin access required' },
        { status: 403 },
      );
    }

    const { id } = await ctx.params;

    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: { isFavorite: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
      select: { id: true, isFavorite: true },
    });

    return NextResponse.json({ ok: true, supplier });
  } catch (err: unknown) {
    return toApiErrorResponse(err, 'PATCH /api/suppliers/[id] error:');
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id || !getOfficeOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Office or admin access required' },
        { status: 403 },
      );
    }

    const { id } = await ctx.params;

    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return toApiErrorResponse(err, 'DELETE /api/suppliers/[id] error:');
  }
}
