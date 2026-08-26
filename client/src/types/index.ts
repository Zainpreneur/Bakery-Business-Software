export type Role = "ADMIN" | "MANAGER" | "STAFF";
export type OrderStatus = "PENDING" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED";
export type OrderType = "WALK_IN" | "PHONE" | "ONLINE" | "CATERING";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type InventoryTxnType = "PURCHASE" | "USAGE" | "ADJUSTMENT" | "WASTE";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  _count?: { ingredients: number };
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  quantityInStock: number;
  reorderThreshold: number;
  supplierId?: string | null;
  supplier?: Supplier | null;
  createdAt?: string;
  transactions?: InventoryTransaction[];
}

export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  type: InventoryTxnType;
  quantity: number;
  note?: string | null;
  createdAt: string;
}

export interface RecipeItem {
  id?: string;
  productId?: string;
  ingredientId: string;
  quantity: number;
  ingredient?: Ingredient;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  isActive: boolean;
  imageUrl?: string | null;
  recipeItems: RecipeItem[];
  recipeCost?: number;
  maxMakeable?: number | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: { orders: number };
  orders?: Order[];
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customer?: Customer | null;
  status: OrderStatus;
  orderType: OrderType;
  paymentStatus: PaymentStatus;
  dueDate?: string | null;
  notes?: string | null;
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export interface Expense {
  id: string;
  category: string;
  description?: string | null;
  amount: number;
  date: string;
}

export interface DashboardSummary {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  ordersTodayCount: number;
  pendingOrders: number;
  customerCount: number;
  lowStockCount: number;
  lowStockIngredients: Ingredient[];
  expensesMonth: number;
  revenueTrend: { date: string; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}
