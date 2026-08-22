import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Expense } from "../types";
import { Button, Card, EmptyState, Input, Label, Modal, Spinner, money } from "../components/ui";

const emptyForm = { category: "Utilities", description: "", amount: 0, date: new Date().toISOString().slice(0, 10) };

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get<Expense[]>("/expenses");
    setExpenses(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.post("/expenses", form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: Expense) {
    if (!confirm("Delete this expense?")) return;
    await api.delete(`/expenses/${e.id}`);
    await load();
  }

  if (!expenses) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-crust-800">Expenses</h1>
          <p className="text-sm text-crust-800/60">Rent, utilities, equipment, and other overhead.</p>
        </div>
        <Button onClick={openCreate}>+ New Expense</Button>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <EmptyState title="No expenses recorded" />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-crust-800/10 text-xs uppercase tracking-wide text-crust-800/50">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crust-800/5">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-cream-50">
                  <td className="px-4 py-3 text-crust-800/60">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-crust-800">{e.category}</td>
                  <td className="px-4 py-3 text-crust-800/60">{e.description}</td>
                  <td className="px-4 py-3">{money(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => handleDelete(e)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-crust-800/10 font-semibold text-crust-800">
                <td className="px-4 py-3" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3">{money(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Expense">
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.category || form.amount <= 0}>
              {saving ? "Saving…" : "Save Expense"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
