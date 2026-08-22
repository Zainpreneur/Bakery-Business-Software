import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [ordersToday, ordersWeek, ordersMonth, pendingOrders, customerCount, ingredients, expensesMonth] =
      await Promise.all([
        prisma.order.findMany({ where: { createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } } }),
        prisma.order.findMany({ where: { createdAt: { gte: startOfWeek }, status: { not: "CANCELLED" } } }),
        prisma.order.findMany({ where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } } }),
        prisma.order.count({ where: { status: { in: ["PENDING", "IN_PROGRESS", "READY"] } } }),
        prisma.customer.count(),
        prisma.ingredient.findMany(),
        prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
      ]);

    const sum = (orders: { totalAmount: number }[]) => orders.reduce((s, o) => s + o.totalAmount, 0);
    const lowStockIngredients = ingredients.filter((i) => i.quantityInStock <= i.reorderThreshold);

    // Revenue trend for the last 30 days, bucketed by day.
    const recentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } },
      select: { createdAt: true, totalAmount: true },
    });
    const trendMap = new Map<string, number>();
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      trendMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of recentOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) ?? 0) + o.totalAmount);
    }
    const revenueTrend = [...trendMap.entries()].map(([date, revenue]) => ({ date, revenue }));

    // Top products by units sold in the last 30 days.
    const items = await prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } } },
      include: { product: true },
    });
    const productTotals = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of items) {
      const entry = productTotals.get(item.productId) ?? { name: item.product.name, qty: 0, revenue: 0 };
      entry.qty += item.quantity;
      entry.revenue += item.subtotal;
      productTotals.set(item.productId, entry);
    }
    const topProducts = [...productTotals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

    res.json({
      revenueToday: sum(ordersToday),
      revenueWeek: sum(ordersWeek),
      revenueMonth: sum(ordersMonth),
      ordersTodayCount: ordersToday.length,
      pendingOrders,
      customerCount,
      lowStockCount: lowStockIngredients.length,
      lowStockIngredients: lowStockIngredients.slice(0, 10),
      expensesMonth: expensesMonth._sum.amount ?? 0,
      revenueTrend,
      topProducts,
    });
  })
);

export default router;
