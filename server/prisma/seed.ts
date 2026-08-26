import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();

  const adminPass = await bcrypt.hash("admin123", 10);
  const staffPass = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.create({
    data: { name: "Admin Baker", email: "admin@bakery.test", passwordHash: adminPass, role: "ADMIN" },
  });
  await prisma.user.create({
    data: { name: "Sam Staff", email: "staff@bakery.test", passwordHash: staffPass, role: "STAFF" },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: "Golden Grain Wholesale",
      contactName: "Priya Shah",
      email: "orders@goldengrain.test",
      phone: "555-0101",
      address: "12 Mill Rd",
    },
  });

  const flour = await prisma.ingredient.create({
    data: { name: "Flour", unit: "g", costPerUnit: 0.002, quantityInStock: 25000, reorderThreshold: 5000, supplierId: supplier.id },
  });
  const sugar = await prisma.ingredient.create({
    data: { name: "Sugar", unit: "g", costPerUnit: 0.0015, quantityInStock: 15000, reorderThreshold: 3000, supplierId: supplier.id },
  });
  const butter = await prisma.ingredient.create({
    data: { name: "Butter", unit: "g", costPerUnit: 0.008, quantityInStock: 8000, reorderThreshold: 2000, supplierId: supplier.id },
  });
  const eggs = await prisma.ingredient.create({
    data: { name: "Eggs", unit: "unit", costPerUnit: 0.25, quantityInStock: 200, reorderThreshold: 48 },
  });
  const chocolate = await prisma.ingredient.create({
    data: { name: "Chocolate Chips", unit: "g", costPerUnit: 0.01, quantityInStock: 6000, reorderThreshold: 1000, supplierId: supplier.id },
  });
  const milk = await prisma.ingredient.create({
    data: { name: "Milk", unit: "ml", costPerUnit: 0.001, quantityInStock: 10000, reorderThreshold: 2000 },
  });
  const yeast = await prisma.ingredient.create({
    data: { name: "Yeast", unit: "g", costPerUnit: 0.02, quantityInStock: 500, reorderThreshold: 100 },
  });

  const croissant = await prisma.product.create({
    data: {
      name: "Butter Croissant",
      description: "Classic flaky, buttery croissant",
      category: "Pastries",
      price: 3.5,
      recipeItems: {
        create: [
          { ingredientId: flour.id, quantity: 80 },
          { ingredientId: butter.id, quantity: 40 },
          { ingredientId: yeast.id, quantity: 3 },
          { ingredientId: milk.id, quantity: 20 },
        ],
      },
    },
  });

  const chocChip = await prisma.product.create({
    data: {
      name: "Chocolate Chip Cookie",
      description: "Soft-baked cookie loaded with chocolate chips",
      category: "Cookies",
      price: 2.25,
      recipeItems: {
        create: [
          { ingredientId: flour.id, quantity: 40 },
          { ingredientId: sugar.id, quantity: 25 },
          { ingredientId: butter.id, quantity: 20 },
          { ingredientId: chocolate.id, quantity: 30 },
          { ingredientId: eggs.id, quantity: 0.25 },
        ],
      },
    },
  });

  const sourdough = await prisma.product.create({
    data: {
      name: "Sourdough Loaf",
      description: "Naturally leavened artisan sourdough",
      category: "Bread",
      price: 7.0,
      recipeItems: {
        create: [
          { ingredientId: flour.id, quantity: 500 },
          { ingredientId: yeast.id, quantity: 5 },
        ],
      },
    },
  });

  const birthdayCake = await prisma.product.create({
    data: {
      name: "Vanilla Birthday Cake",
      description: "Custom vanilla layer cake, serves 12",
      category: "Cakes",
      price: 38,
      recipeItems: {
        create: [
          { ingredientId: flour.id, quantity: 600 },
          { ingredientId: sugar.id, quantity: 400 },
          { ingredientId: butter.id, quantity: 250 },
          { ingredientId: eggs.id, quantity: 6 },
          { ingredientId: milk.id, quantity: 300 },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Blueberry Muffin",
      description: "Moist muffin bursting with blueberries",
      category: "Pastries",
      price: 3.0,
      recipeItems: {
        create: [
          { ingredientId: flour.id, quantity: 60 },
          { ingredientId: sugar.id, quantity: 30 },
          { ingredientId: butter.id, quantity: 20 },
          { ingredientId: eggs.id, quantity: 0.3 },
          { ingredientId: milk.id, quantity: 30 },
        ],
      },
    },
  });

  const alice = await prisma.customer.create({
    data: { name: "Alice Johnson", email: "alice@example.com", phone: "555-1010", address: "22 Baker St" },
  });
  const bob = await prisma.customer.create({
    data: { name: "Bob Martinez", email: "bob@example.com", phone: "555-2020" },
  });
  await prisma.customer.create({
    data: { name: "Carol Nguyen", email: "carol@example.com", phone: "555-3030" },
  });

  async function makeOrder(
    daysAgo: number,
    customerId: string | null,
    items: { product: { id: string; price: number }; quantity: number }[],
    status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "READY" = "COMPLETED"
  ) {
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const totalAmount = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const count = await prisma.order.count();
    await prisma.order.create({
      data: {
        orderNumber: `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`,
        customerId,
        orderType: "WALK_IN",
        status,
        paymentStatus: status === "COMPLETED" ? "PAID" : "UNPAID",
        totalAmount,
        paidAmount: status === "COMPLETED" ? totalAmount : 0,
        createdById: admin.id,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPrice: i.product.price,
            subtotal: i.product.price * i.quantity,
          })),
        },
      },
    });
  }

  for (let day = 29; day >= 0; day -= 3) {
    await makeOrder(day, alice.id, [
      { product: croissant, quantity: 4 },
      { product: chocChip, quantity: 6 },
    ]);
  }
  await makeOrder(2, bob.id, [{ product: sourdough, quantity: 2 }], "PENDING");
  await makeOrder(1, bob.id, [{ product: birthdayCake, quantity: 1 }], "IN_PROGRESS");
  await makeOrder(0, null, [{ product: chocChip, quantity: 12 }], "READY");

  await prisma.expense.createMany({
    data: [
      { category: "Utilities", description: "Electricity bill", amount: 210.5 },
      { category: "Rent", description: "Monthly storefront rent", amount: 1800 },
      { category: "Equipment", description: "Mixer repair", amount: 120 },
    ],
  });

  console.log("Seed complete.");
  console.log("Login with admin@bakery.test / admin123 or staff@bakery.test / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
