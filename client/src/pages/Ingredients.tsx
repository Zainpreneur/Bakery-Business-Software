import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Ingredient, InventoryTxnType, Supplier } from "../types";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, money } from "../components/ui";

const emptyForm = {
  name: "",
  unit: "g",
  costPerUnit: 0,
  quantityInStock: 0,
  reorderThreshold: 0,
  supplierId: "" as string | null,
};

export function Ingredients() {
  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [stockTarget, setStockTarget] = useState<Ingredient | null>(null);
  const [stockForm, setStockForm] = useState<{ type: InventoryTxnType; quantity: number; note: string }>({
    type: "PURCHASE",
    quantity: 0,
    note: "",
  });

  async function load() {
    const [i, s] = await Promise.all([api.get<Ingredient[]>("/ingredients"), api.get<Supplier[]>("/suppliers")]);
    setIngredients(i.data);
    setSuppliers(s.data);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(ing: Ingredient) {
    setEditing(ing);
    setForm({
      name: ing.name,
      unit: ing.unit,
      costPerUnit: ing.costPerUnit,
      quantityInStock: ing.quantityInStock,
      reorderThreshold: ing.reorderThreshold,
      supplierId: ing.supplierId ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, supplierId: form.supplierId || null };
      if (editing) {
        await api.put(`/ingredients/${editing.id}`, payload);
      } else {
        await api.post("/ingredients", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ing: Ingredient) {
    if (!confirm(`Remove "${ing.name}"?`)) return;
    try {
      await api.delete(`/ingredients/${ing.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  function openStock(ing: Ingredient) {
    setStockTarget(ing);
    setStockForm({ type: "PURCHASE", quantity: 0, note: "" });
    setError("");
  }

  async function handleStockSave() {
    if (!stockTarget) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/ingredients/${stockTarget.id}/transactions`, stockForm);
      setStockTarget(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!ingredients) {
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
          <h1 className="font-display text-2xl font-semibold text-crust-800">Inventory & Ingredients</h1>
          <p className="text-sm text-crust-800/60">Track stock levels, costs, and reorder points.</p>
        </div>
        <Button onClick={openCreate}>+ New Ingredient</Button>
      </div>

      <Card className="overflow-x-auto">
        {ingredients.length === 0 ? (
          <EmptyState title="No ingredients yet" subtitle="Add ingredients to build product recipes." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-crust-800/10 text-xs uppercase tracking-wide text-crust-800/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Reorder At</th>
                <th className="px-4 py-3">Cost / Unit</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crust-800/5">
              {ingredients.map((ing) => {
                const low = ing.quantityInStock <= ing.reorderThreshold;
                return (
                  <tr key={ing.id} className="hover:bg-cream-50">
                    <td className="px-4 py-3 font-medium text-crust-800">{ing.name}</td>
                    <td className="px-4 py-3">
                      {ing.quantityInStock} {ing.unit}
                    </td>
                    <td className="px-4 py-3 text-crust-800/60">
                      {ing.reorderThreshold} {ing.unit}
                    </td>
                    <td className="px-4 py-3">{money(ing.costPerUnit)}</td>
                    <td className="px-4 py-3 text-crust-800/60">{ing.supplier?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {low ? <Badge value="CANCELLED" label="Low stock" /> : <Badge value="COMPLETED" label="OK" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => openStock(ing)}>
                          Adjust Stock
                        </Button>
                        <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => openEdit(ing)}>
                          Edit
                        </Button>
                        <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => handleDelete(ing)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Ingredient" : "New Ingredient"}>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit</Label>
              <Input
                placeholder="g, kg, ml, l, unit…"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <Label>Cost / Unit ($)</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={form.costPerUnit}
                onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current Stock</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.quantityInStock}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, quantityInStock: Number(e.target.value) })}
              />
              {editing && <p className="mt-1 text-[11px] text-crust-800/40">Use "Adjust Stock" to change this.</p>}
            </div>
            <div>
              <Label>Reorder Threshold</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.reorderThreshold}
                onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Supplier</Label>
            <Select value={form.supplierId ?? ""} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving…" : "Save Ingredient"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!stockTarget} onClose={() => setStockTarget(null)} title={`Adjust Stock — ${stockTarget?.name ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-crust-800/60">
            Current stock: <strong>{stockTarget?.quantityInStock}</strong> {stockTarget?.unit}
          </p>
          <div>
            <Label>Type</Label>
            <Select
              value={stockForm.type}
              onChange={(e) => setStockForm({ ...stockForm, type: e.target.value as InventoryTxnType })}
            >
              <option value="PURCHASE">Purchase (stock in)</option>
              <option value="ADJUSTMENT">Adjustment (+/-)</option>
              <option value="USAGE">Usage (stock out)</option>
              <option value="WASTE">Waste / spoilage (stock out)</option>
            </Select>
          </div>
          <div>
            <Label>
              Quantity {stockForm.type === "ADJUSTMENT" ? "(use negative to subtract)" : ""} ({stockTarget?.unit})
            </Label>
            <Input
              type="number"
              step="0.01"
              value={stockForm.quantity}
              onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Note</Label>
            <Input value={stockForm.note} onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStockTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleStockSave} disabled={saving}>
              {saving ? "Saving…" : "Record"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
