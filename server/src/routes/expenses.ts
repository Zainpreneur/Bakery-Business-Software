import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
    res.json(expenses);
  })
);

const expenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  date: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = expenseSchema.parse(req.body);
    const expense = await prisma.expense.create({
      data: { ...data, date: data.date ? new Date(data.date) : new Date() },
    });
    res.status(201).json(expense);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
