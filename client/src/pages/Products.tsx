import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Ingredient, Product, RecipeItem } from "../types";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, Textarea, money } from "../components/ui";

const emptyForm = {
  name: "",
  description: "",
  category: "General",
  price: 0,
  isActive: true,
  recipeItems: [] as RecipeItem[],
};

export function Products() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, i] = await Promise.all([api.get<Product[]>("/products"), api.get<Ingredient[]>("/ingredients")]);
    setProducts(p.data);
    setIngredients(i.data);
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

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      price: product.price,
      isActive: product.isActive,
      recipeItems: product.recipeItems.map((r) => ({ ingredientId: r.ingredientId, quantity: r.quantity })),
    });
    setError("");
    setModalOpen(true);
  }

  function updateRecipeRow(index: number, patch: Partial<RecipeItem>) {
    setForm((f) => ({
      ...f,
      recipeItems: f.recipeItems.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function addRecipeRow() {
    if (ingredients.length === 0) return;
    setForm((f) => ({
      ...f,
      recipeItems: [...f.recipeItems, { ingredientId: ingredients[0].id, quantity: 1 }],
    }));
  }

  function removeRecipeRow(index: number) {
    setForm((f) => ({ ...f, recipeItems: f.recipeItems.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form);
      } else {
        await api.post("/products", form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Remove "${product.name}"?`)) return;
    await api.delete(`/products/${product.id}`);
    await load();
  }

  if (!products) {
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
          <h1 className="font-display text-2xl font-semibold text-crust-800">Products & Recipes</h1>
          <p className="text-sm text-crust-800/60">Manage your menu and the ingredients each item uses.</p>
        </div>
        <Button onClick={openCreate}>+ New Product</Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <EmptyState title="No products yet" subtitle="Add your first bakery item to get started." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="mb-1 flex items-start justify-between">
                <h3 className="font-display text-lg font-semibold text-crust-800">{p.name}</h3>
                {!p.isActive && <Badge value="default" label="Inactive" />}
              </div>
              <p className="text-xs uppercase tracking-wide text-crust-800/50">{p.category}</p>
              {p.description && <p className="mt-2 text-sm text-crust-800/70">{p.description}</p>}
              <p className="mt-3 font-display text-xl font-semibold text-amber-700">{money(p.price)}</p>
              <div className="mt-2 flex-1 text-xs text-crust-800/60">
                {p.recipeItems.length > 0 ? (
                  <ul className="space-y-0.5">
                    {p.recipeItems.map((r) => (
                      <li key={r.ingredientId}>
                        {r.ingredient?.name}: {r.quantity} {r.ingredient?.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic">No recipe defined</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => openEdit(p)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => handleDelete(p)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "New Product"} width="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm text-crust-800">
                Active (visible for sale)
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Recipe (ingredients used per unit)</Label>
              <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={addRecipeRow}>
                + Add ingredient
              </Button>
            </div>
            <div className="space-y-2">
              {form.recipeItems.map((row, i) => {
                const ing = ingredients.find((x) => x.id === row.ingredientId);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      className="flex-1"
                      value={row.ingredientId}
                      onChange={(e) => updateRecipeRow(i, { ingredientId: e.target.value })}
                    >
                      {ingredients.map((ing2) => (
                        <option key={ing2.id} value={ing2.id}>
                          {ing2.name}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-28"
                      value={row.quantity}
                      onChange={(e) => updateRecipeRow(i, { quantity: Number(e.target.value) })}
                    />
                    <span className="w-10 text-xs text-crust-800/50">{ing?.unit}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipeRow(i)}
                      className="text-crust-800/40 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {form.recipeItems.length === 0 && (
                <p className="text-xs italic text-crust-800/40">No ingredients added yet.</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving…" : "Save Product"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
