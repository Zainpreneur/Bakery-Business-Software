import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Customer, Order, OrderStatus, OrderType, Product } from "../types";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, money } from "../components/ui";

const STATUS_FLOW: OrderStatus[] = ["PENDING", "IN_PROGRESS", "READY", "COMPLETED"];

interface CartLine {
  productId: string;
  quantity: number;
}

export function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("WALK_IN");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [paymentTarget, setPaymentTarget] = useState<Order | null>(null);
  const [paymentInput, setPaymentInput] = useState(0);

  async function load() {
    const res = await api.get<Order[]>("/orders", {
      params: statusFilter ? { status: statusFilter } : undefined,
    });
    setOrders(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    Promise.all([api.get<Product[]>("/products", { params: { active: true } }), api.get<Customer[]>("/customers")]).then(
      ([p, c]) => {
        setProducts(p.data);
        setCustomers(c.data);
      }
    );
  }, []);

  function openNewOrder() {
    setCart([]);
    setCustomerId("");
    setOrderType("WALK_IN");
    setDueDate("");
    setNotes("");
    setPaidAmount(0);
    setError("");
    setModalOpen(true);
  }

  function addToCart(productId: string) {
    setCart((c) => {
      const existing = c.find((l) => l.productId === productId);
      if (existing) return c.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { productId, quantity: 1 }];
    });
  }

  function updateQty(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((c) => c.filter((l) => l.productId !== productId));
      return;
    }
    setCart((c) => c.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  }

  const total = useMemo(() => {
    return cart.reduce((sum, line) => {
      const p = products.find((x) => x.id === line.productId);
      return sum + (p?.price ?? 0) * line.quantity;
    }, 0);
  }, [cart, products]);

  async function submitOrder() {
    setSaving(true);
    setError("");
    try {
      await api.post("/orders", {
        customerId: customerId || null,
        orderType,
        dueDate: dueDate || null,
        notes,
        paidAmount,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus(order: Order) {
    const idx = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    await api.put(`/orders/${order.id}/status`, { status: next });
    await load();
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`Cancel order ${order.orderNumber}? Ingredients will be restocked.`)) return;
    await api.put(`/orders/${order.id}/status`, { status: "CANCELLED" });
    await load();
  }

  function openPayment(order: Order) {
    setPaymentTarget(order);
    setPaymentInput(order.paidAmount);
  }

  async function savePayment() {
    if (!paymentTarget) return;
    await api.put(`/orders/${paymentTarget.id}/payment`, { paidAmount: paymentInput });
    setPaymentTarget(null);
    await load();
  }

  if (!orders) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-crust-800">Orders & POS</h1>
          <p className="text-sm text-crust-800/60">Take new orders and track fulfillment.</p>
        </div>
        <Button onClick={openNewOrder}>+ New Order</Button>
      </div>

      <div className="flex gap-2">
        {["", "PENDING", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusFilter === s ? "bg-crust-700 text-white" : "bg-cream-200 text-crust-800/70"
            }`}
          >
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <EmptyState title="No orders found" />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-crust-800/10 text-xs uppercase tracking-wide text-crust-800/50">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crust-800/5">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-cream-50">
                  <td className="px-4 py-3 font-medium text-crust-800">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-crust-800/70">{o.customer?.name ?? "Walk-in"}</td>
                  <td className="px-4 py-3 text-crust-800/60">
                    {o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 font-medium">{money(o.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openPayment(o)}>
                      <Badge value={o.paymentStatus} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={o.status} />
                  </td>
                  <td className="px-4 py-3 text-crust-800/50">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {STATUS_FLOW.indexOf(o.status) < STATUS_FLOW.length - 1 && o.status !== "CANCELLED" && (
                        <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => advanceStatus(o)}>
                          Mark {STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1]?.replace("_", " ")}
                        </Button>
                      )}
                      {o.status !== "COMPLETED" && o.status !== "CANCELLED" && (
                        <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => cancelOrder(o)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Order" width="max-w-3xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Label>Products</Label>
            <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-crust-800/10 p-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p.id)}
                  className="rounded-lg border border-crust-800/10 p-2 text-left text-sm hover:border-amber-550 hover:bg-amber-50"
                >
                  <p className="font-medium text-crust-800">{p.name}</p>
                  <p className="text-xs text-crust-800/50">{money(p.price)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Cart</Label>
              {cart.length === 0 ? (
                <p className="text-sm italic text-crust-800/40">No items added yet — click a product to add it.</p>
              ) : (
                <ul className="space-y-2">
                  {cart.map((line) => {
                    const p = products.find((x) => x.id === line.productId);
                    return (
                      <li key={line.productId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex-1 text-crust-800">{p?.name}</span>
                        <Input
                          type="number"
                          min="0"
                          className="w-16"
                          value={line.quantity}
                          onChange={(e) => updateQty(line.productId, Number(e.target.value))}
                        />
                        <span className="w-16 text-right text-crust-800/60">
                          {money((p?.price ?? 0) * line.quantity)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-2 flex justify-between border-t border-crust-800/10 pt-2 font-semibold text-crust-800">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer</Label>
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Walk-in</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Order Type</Label>
                <Select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)}>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="PHONE">Phone</option>
                  <option value="ONLINE">Online</option>
                  <option value="CATERING">Catering</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Amount Paid Now ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitOrder} disabled={saving || cart.length === 0}>
                {saving ? "Placing…" : "Place Order"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title={`Payment — ${paymentTarget?.orderNumber ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-crust-800/60">
            Total due: <strong>{money(paymentTarget?.totalAmount)}</strong>
          </p>
          <div>
            <Label>Amount Paid</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={paymentInput}
              onChange={(e) => setPaymentInput(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPaymentTarget(null)}>
              Cancel
            </Button>
            <Button onClick={savePayment}>Save Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
