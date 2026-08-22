import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import customerRoutes from "./routes/customers";
import supplierRoutes from "./routes/suppliers";
import ingredientRoutes from "./routes/ingredients";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import expenseRoutes from "./routes/expenses";
import dashboardRoutes from "./routes/dashboard";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan("dev"));

  app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/ingredients", ingredientRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}
