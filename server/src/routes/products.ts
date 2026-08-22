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
    const activeOnly = req.query.active === "true";
    const products = await prisma.product.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
      include: { recipeItems: { include: { ingredient: true } } },
    });
    res.json(products);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { recipeItems: { include: { ingredient: true } } },
    });
    if (!product) throw new HttpError(404, "Product not found");

    // Compute recipe cost and how many units can currently be made given ingredient stock.
    const recipeCost = product.recipeItems.reduce(
      (sum, item) => sum + item.quantity * item.ingredient.costPerUnit,
      0
    );
    const maxMakeable =
      product.recipeItems.length === 0
        ? null
        : Math.min(
            ...product.recipeItems.map((item) =>
              item.quantity > 0 ? Math.floor(item.ingredient.quantityInStock / item.quantity) : Infinity
            )
          );

    res.json({ ...product, recipeCost, maxMakeable });
  })
);

const recipeItemSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
});

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default("General"),
  price: z.number().nonnegative(),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional(),
  recipeItems: z.array(recipeItemSchema).default([]),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price,
        isActive: data.isActive,
        imageUrl: data.imageUrl,
        recipeItems: { create: data.recipeItems },
      },
      include: { recipeItems: { include: { ingredient: true } } },
    });
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    const { recipeItems, ...rest } = data;

    const product = await prisma.$transaction(async (tx) => {
      if (recipeItems) {
        await tx.recipeItem.deleteMany({ where: { productId: req.params.id } });
        await tx.recipeItem.createMany({
          data: recipeItems.map((r) => ({ ...r, productId: req.params.id })),
        });
      }
      return tx.product.update({
        where: { id: req.params.id },
        data: rest,
        include: { recipeItems: { include: { ingredient: true } } },
      });
    });

    res.json(product);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const inUse = await prisma.orderItem.count({ where: { productId: req.params.id } });
    if (inUse > 0) {
      // Preserve order history: soft-delete instead of hard delete.
      const product = await prisma.product.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      return res.json({ ...product, softDeleted: true });
    }
    await prisma.recipeItem.deleteMany({ where: { productId: req.params.id } });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
