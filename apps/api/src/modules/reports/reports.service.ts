import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const [todaySales, monthSales, totalSales, lowStockCount, nearExpiry30, nearExpiry90, pendingPOs] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: { tenantId, status: 'completed', saleDate: { gte: today } },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.sale.aggregate({
          where: { tenantId, status: 'completed', saleDate: { gte: monthStart } },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.sale.aggregate({
          where: { tenantId, status: 'completed' },
          _sum: { total: true },
        }),
        this.prisma.product.count({
          where: { tenantId, isActive: true, stockLevels: { none: { quantity: { gt: 0 } } } },
        }),
        this.prisma.batch.count({
          where: { tenantId, expiryDate: { lte: thirtyDays, gt: new Date() }, stockLevels: { some: { quantity: { gt: 0 } } } },
        }),
        this.prisma.batch.count({
          where: { tenantId, expiryDate: { lte: ninetyDays, gt: new Date() }, stockLevels: { some: { quantity: { gt: 0 } } } },
        }),
        this.prisma.purchaseOrder.count({
          where: { tenantId, status: { in: ['draft', 'sent'] } },
        }),
      ]);

    return {
      today: {
        revenue: Number(todaySales._sum.total ?? 0),
        transactions: todaySales._count,
      },
      month: {
        revenue: Number(monthSales._sum.total ?? 0),
        transactions: monthSales._count,
      },
      allTime: {
        revenue: Number(totalSales._sum.total ?? 0),
      },
      alerts: {
        lowStock: lowStockCount,
        nearExpiry30Days: nearExpiry30,
        nearExpiry90Days: nearExpiry90,
        pendingPOs,
      },
    };
  }

  async getSalesReport(tenantId: string, from: Date, to: Date, branchId?: string) {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: 'completed',
        saleDate: { gte: from, lte: to },
        ...(branchId && { branchId }),
      },
      include: {
        items: {
          include: { product: { select: { name: true, genericName: true } } },
        },
        cashier: { select: { name: true } },
      },
      orderBy: { saleDate: 'asc' },
    });

    // Group by date
    const byDate: Record<string, { revenue: number; transactions: number; tax: number; discount: number }> = {};
    for (const sale of sales) {
      const key = sale.saleDate.toISOString().slice(0, 10);
      if (!byDate[key]) byDate[key] = { revenue: 0, transactions: 0, tax: 0, discount: 0 };
      byDate[key].revenue += Number(sale.total);
      byDate[key].transactions += 1;
      byDate[key].tax += Number(sale.taxAmount);
      byDate[key].discount += Number(sale.discountAmount);
    }

    // Top products by revenue
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.product.name, qty: 0, revenue: 0 };
        }
        productMap[item.productId].qty += item.quantity;
        productMap[item.productId].revenue += Number(item.lineTotal);
      }
    }

    const topProducts = Object.entries(productMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([productId, v]) => ({ productId, ...v }));

    // Payment method breakdown
    const paymentMap: Record<string, { count: number; amount: number }> = {};
    for (const sale of sales) {
      const payments = sale.payments as { method: string; amount: number }[];
      for (const p of payments) {
        if (!paymentMap[p.method]) paymentMap[p.method] = { count: 0, amount: 0 };
        paymentMap[p.method].count += 1;
        paymentMap[p.method].amount += p.amount;
      }
    }

    return {
      summary: {
        totalRevenue: sales.reduce((s, x) => s + Number(x.total), 0),
        totalTransactions: sales.length,
        totalTax: sales.reduce((s, x) => s + Number(x.taxAmount), 0),
        totalDiscount: sales.reduce((s, x) => s + Number(x.discountAmount), 0),
        avgOrderValue: sales.length
          ? sales.reduce((s, x) => s + Number(x.total), 0) / sales.length
          : 0,
      },
      byDate: Object.entries(byDate)
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topProducts,
      paymentMethods: Object.entries(paymentMap).map(([method, v]) => ({ method, ...v })),
    };
  }

  async getInventoryReport(tenantId: string) {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const [nearExpiry, outOfStock, lowStock, stockLevels] = await Promise.all([
      this.prisma.batch.findMany({
        where: {
          tenantId,
          expiryDate: { lte: ninetyDays, gt: new Date() },
          stockLevels: { some: { quantity: { gt: 0 } } },
        },
        include: {
          product: { select: { name: true, salePrice: true } },
          stockLevels: {
            include: { branch: { select: { name: true } } },
          },
        },
        orderBy: { expiryDate: 'asc' },
        take: 50,
      }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true, stockLevels: { none: { quantity: { gt: 0 } } } },
        select: { id: true, name: true, genericName: true, reorderPoint: true },
      }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true, reorderPoint: { gt: 0 } },
        include: { stockLevels: { select: { quantity: true } } },
      }),
      this.prisma.stockLevel.findMany({
        where: { tenantId, quantity: { gt: 0 } },
        include: { batch: { select: { costPerUnit: true } } },
      }),
    ]);

    const belowReorder = lowStock
      .map((p) => ({
        ...p,
        totalStock: p.stockLevels.reduce((s, l) => s + l.quantity, 0),
      }))
      .filter((p) => p.totalStock <= p.reorderPoint);

    const totalStockValue = stockLevels.reduce(
      (s, sl) => s + sl.quantity * Number(sl.batch.costPerUnit),
      0,
    );

    return {
      nearExpiry30Days: nearExpiry.filter((b) => b.expiryDate <= thirtyDays),
      nearExpiry90Days: nearExpiry,
      outOfStock,
      belowReorder,
      totalStockValue,
    };
  }

  async getSalesByProduct(tenantId: string, from: Date, to: Date) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: { tenantId, status: 'completed', saleDate: { gte: from, lte: to } },
      },
      include: {
        product: { select: { name: true, genericName: true } },
        sale: { select: { saleDate: true } },
      },
    });

    const map: Record<string, { name: string; qty: number; revenue: number; transactions: number }> = {};
    for (const item of items) {
      if (!map[item.productId]) {
        map[item.productId] = { name: item.product.name, qty: 0, revenue: 0, transactions: 0 };
      }
      map[item.productId].qty += item.quantity;
      map[item.productId].revenue += Number(item.lineTotal);
      map[item.productId].transactions += 1;
    }

    return Object.entries(map)
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }
}
