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
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { ingredients: true } } },
    });
    res.json(suppliers);
  })
);

const supplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data: { ...data, email: data.email || null } });
    res.status(201).json(supplier);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = supplierSchema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { ...data, email: data.email || undefined },
    });
    res.json(supplier);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const inUse = await prisma.ingredient.count({ where: { supplierId: req.params.id } });
    if (inUse > 0) throw new HttpError(409, "Cannot delete a supplier linked to ingredients");
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
