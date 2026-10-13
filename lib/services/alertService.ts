/**
 * Alert Service
 * Manages automatic alerts for stock issues
 */

import { prisma } from '@/server/db/prisma';
import { getExpiredBatches, getExpiringBatches, getTotalAvailableQuantity } from './stockService';

export interface Alert {
  id: number;
  type: 'LOW_STOCK' | 'EXPIRED' | 'EXPIRING_SOON' | 'RUPTURE' | 'EXCESS';
  product_id: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  is_resolved: boolean;
  resolved_at: Date | null;
  created_at: Date;
}

/**
 * Create an alert using Prisma
 */
export async function createAlert(
  type: Alert['type'],
  productId: number,
  message: string,
  severity: Alert['severity'] = 'WARNING'
): Promise<number> {
  const alert = await prisma.alerts.create({
    data: { type, product_id: productId, message, severity },
  });
  return alert.id;
}

/**
 * Get active alerts (unresolved)
 */
export async function getActiveAlerts(
  limit: number = 100
): Promise<(Alert & { product_name: string })[]> {
  const alerts = await prisma.alerts.findMany({
    where: { is_resolved: false },
    include: { product: { select: { name: true } } },
    orderBy: [{ severity: 'desc' }, { created_at: 'desc' }],
    take: limit,
  });
  return alerts.map(a => ({ ...a, product_name: a.product?.name || '' }));
}

/**
 * Clear all unresolved alerts
 */
export async function clearAllAlerts(): Promise<void> {
  await prisma.alerts.deleteMany({
    where: { is_resolved: false },
  });
}

/**
 * Check for low stock alerts
 */
export async function checkLowStockAlerts(): Promise<void> {
  const products = await prisma.products.findMany({
    where: { is_active: true },
    select: { id: true, name: true, minimum_stock: true },
  });
  for (const product of products) {
    const currentQty = await getTotalAvailableQuantity(product.id);
    // minimum_stock is Decimal, so convert to number for comparison
    const minStock = typeof product.minimum_stock === 'object' && 'toNumber' in product.minimum_stock
      ? product.minimum_stock.toNumber()
      : Number(product.minimum_stock);
    if (currentQty < minStock) {
      const existing = await prisma.alerts.findFirst({
        where: {
          product_id: product.id,
          type: 'LOW_STOCK',
          is_resolved: false,
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        await createAlert(
          'LOW_STOCK',
          product.id,
          `Stock for ${product.name} is low: ${currentQty} (minimum: ${product.minimum_stock})`,
          'WARNING'
        );
      }
    }
  }
}

/**
 * Resolve an alert by ID
 */
export async function resolveAlert(alertId: number): Promise<boolean> {
  const alert = await prisma.alerts.findUnique({
    where: { id: alertId },
  });
  if (!alert) return false;
  await prisma.alerts.update({
    where: { id: alertId },
    data: { is_resolved: true, resolved_at: new Date() },
  });
  return true;
}
