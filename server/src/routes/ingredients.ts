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
    const lowStockOnly = req.query.lowStock === "true";
    const ingredients = await prisma.ingredient.findMany({
      where: undefined,
      orderBy: { name: "asc" },
      include: { supplier: true },
    });
    const result = lowStockOnly
      ? ingredients.filter((i) => i.quantityInStock <= i.reorderThreshold)
      : ingredients;
    res.json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        transactions: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    if (!ingredient) throw new HttpError(404, "Ingredient not found");
    res.json(ingredient);
  })
);

const ingredientSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  costPerUnit: z.number().nonnegative().default(0),
  quantityInStock: z.number().nonnegative().default(0),
  reorderThreshold: z.number().nonnegative().default(0),
  supplierId: z.string().nullable().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = ingredientSchema.parse(req.body);
    const ingredient = await prisma.ingredient.create({ data });
    res.status(201).json(ingredient);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = ingredientSchema.partial().parse(req.body);
    const ingredient = await prisma.ingredient.update({ where: { id: req.params.id }, data });
    res.json(ingredient);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const inUse = await prisma.recipeItem.count({ where: { ingredientId: req.params.id } });
    if (inUse > 0) throw new HttpError(409, "Cannot delete an ingredient used in recipes");
    await prisma.ingredient.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// Record a stock movement (purchase, usage, adjustment, waste) and update the running balance.
const txnSchema = z.object({
  type: z.enum(["PURCHASE", "USAGE", "ADJUSTMENT", "WASTE"]),
  quantity: z.number(),
  note: z.string().optional(),
});

router.post(
  "/:id/transactions",
  asyncHandler(async (req, res) => {
    const data = txnSchema.parse(req.body);
    const ingredient = await prisma.ingredient.findUnique({ where: { id: req.params.id } });
    if (!ingredient) throw new HttpError(404, "Ingredient not found");

    const delta =
      data.type === "PURCHASE" || data.type === "ADJUSTMENT" ? data.quantity : -Math.abs(data.quantity);

    const newQuantity = ingredient.quantityInStock + delta;
    if (newQuantity < 0) throw new HttpError(400, "Resulting stock cannot be negative");

    const [txn] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          ingredientId: ingredient.id,
          type: data.type,
          quantity: delta,
          note: data.note,
          createdById: req.user!.sub,
        },
      }),
      prisma.ingredient.update({ where: { id: ingredient.id }, data: { quantityInStock: newQuantity } }),
    ]);

    res.status(201).json(txn);
  })
);

export default router;
