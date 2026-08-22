import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { Role, signToken } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  // Only allowed to self-elevate to ADMIN when no users exist yet (initial setup).
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existingCount = await prisma.user.count();
    const passwordHash = await bcrypt.hash(data.password, 10);

    const role = existingCount === 0 ? "ADMIN" : data.role === "ADMIN" ? "STAFF" : data.role ?? "STAFF";

    const user = await prisma.user.create({
      data: { name: data.name, email: data.email.toLowerCase(), passwordHash, role },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role as Role, name: user.name });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

    if (!user || !user.active) {
      throw new HttpError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role as Role, name: user.name });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new HttpError(404, "User not found");
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);

export default router;
