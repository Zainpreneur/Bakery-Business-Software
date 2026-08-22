import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, customerId, from, to } = req.query as Record<string, string | undefined>;
    const orders = await prisma.order.findMany({
      where: {
        status: status ? (status as any) : undefined,
        customerId: customerId || undefined,
        createdAt:
          from || to
            ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
            : undefined,
      },
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: { include: { product: true } } },
    });
    res.json(orders);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: true } }, createdBy: true },
    });
    if (!order) throw new HttpError(404, "Order not found");
    res.json(order);
  })
);

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const orderSchema = z.object({
  customerId: z.string().optional().nullable(),
  orderType: z.enum(["WALK_IN", "PHONE", "ONLINE", "CATERING"]).default("WALK_IN"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  paidAmount: z.number().nonnegative().default(0),
  items: z.array(orderItemSchema).min(1),
});

async function generateOrderNumber() {
  const count = await prisma.order.count();
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(count + 1).padStart(5, "0")}`;
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = orderSchema.parse(req.body);

    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
      include: { recipeItems: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Verify every product exists, and aggregate total ingredient consumption across the order.
    const ingredientUsage = new Map<string, number>();
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new HttpError(400, `Product ${item.productId} not found`);
      for (const recipe of product.recipeItems) {
        const used = recipe.quantity * item.quantity;
        ingredientUsage.set(recipe.ingredientId, (ingredientUsage.get(recipe.ingredientId) ?? 0) + used);
      }
    }

    const ingredientIds = [...ingredientUsage.keys()];
    const ingredients = await prisma.ingredient.findMany({ where: { id: { in: ingredientIds } } });
    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

    const shortages = ingredientIds
      .map((id) => {
        const need = ingredientUsage.get(id)!;
        const have = ingredientMap.get(id)?.quantityInStock ?? 0;
        return { id, name: ingredientMap.get(id)?.name, need, have };
      })
      .filter((s) => s.have < s.need);

    if (shortages.length > 0) {
      throw new HttpError(
        400,
        `Insufficient stock for: ${shortages.map((s) => `${s.name} (need ${s.need}, have ${s.have})`).join(", ")}`
      );
    }

    const orderNumber = await generateOrderNumber();
    const itemsWithPricing = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const subtotal = product.price * item.quantity;
      return { productId: item.productId, quantity: item.quantity, unitPrice: product.price, subtotal };
    });
    const totalAmount = itemsWithPricing.reduce((sum, i) => sum + i.subtotal, 0);
    const paymentStatus =
      data.paidAmount >= totalAmount && totalAmount > 0
        ? "PAID"
        : data.paidAmount > 0
          ? "PARTIAL"
          : "UNPAID";

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: data.customerId || null,
          orderType: data.orderType,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes,
          totalAmount,
          paidAmount: data.paidAmount,
          paymentStatus,
          createdById: req.user!.sub,
          items: { create: itemsWithPricing },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      for (const [ingredientId, quantity] of ingredientUsage.entries()) {
        await tx.inventoryTransaction.create({
          data: {
            ingredientId,
            type: "USAGE",
            quantity: -quantity,
            note: `Used for order ${orderNumber}`,
            createdById: req.user!.sub,
          },
        });
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { quantityInStock: { decrement: quantity } },
        });
      }

      return created;
    });

    res.status(201).json(order);
  })
);

const statusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"]),
});

router.put(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: { include: { recipeItems: true } } } } },
    });
    if (!existing) throw new HttpError(404, "Order not found");

    if (status === "CANCELLED" && existing.status !== "CANCELLED") {
      // Restock any ingredients consumed by this order.
      await prisma.$transaction(async (tx) => {
        for (const item of existing.items) {
          for (const recipe of item.product.recipeItems) {
            const restock = recipe.quantity * item.quantity;
            await tx.inventoryTransaction.create({
              data: {
                ingredientId: recipe.ingredientId,
                type: "ADJUSTMENT",
                quantity: restock,
                note: `Restock from cancelled order ${existing.orderNumber}`,
                createdById: req.user!.sub,
              },
            });
            await tx.ingredient.update({
              where: { id: recipe.ingredientId },
              data: { quantityInStock: { increment: restock } },
            });
          }
        }
        await tx.order.update({ where: { id: existing.id }, data: { status } });
      });
    } else {
      await prisma.order.update({ where: { id: existing.id }, data: { status } });
    }

    const updated = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: true } } },
    });
    res.json(updated);
  })
);

const paymentSchema = z.object({
  paidAmount: z.number().nonnegative(),
});

router.put(
  "/:id/payment",
  asyncHandler(async (req, res) => {
    const { paidAmount } = paymentSchema.parse(req.body);
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Order not found");

    const paymentStatus =
      paidAmount >= existing.totalAmount && existing.totalAmount > 0
        ? "PAID"
        : paidAmount > 0
          ? "PARTIAL"
          : "UNPAID";

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { paidAmount, paymentStatus },
    });
    res.json(order);
  })
);

export default router;
