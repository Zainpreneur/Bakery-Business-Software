import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Customer } from "../types";
import { Button, Card, EmptyState, Input, Label, Modal, Spinner, Textarea } from "../components/ui";

const emptyForm = { name: "", email: "", phone: "", address: "", notes: "" };

export function Customers() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(q = "") {
    const res = await api.get<Customer[]>("/customers", { params: q ? { search: q } : undefined });
    setCustomers(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => load(search), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
      } else {
        await api.post("/customers", form);
      }
      setModalOpen(false);
      await load(search);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Remove "${c.name}"?`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      await load(search);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (!customers) {
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
          <h1 className="font-display text-2xl font-semibold text-crust-800">Customers</h1>
          <p className="text-sm text-crust-800/60">Your regulars and their order history.</p>
        </div>
        <Button onClick={openCreate}>+ New Customer</Button>
      </div>

      <Input
        placeholder="Search by name, email, or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {customers.length === 0 ? (
        <Card>
          <EmptyState title="No customers found" />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-crust-800/10 text-xs uppercase tracking-wide text-crust-800/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crust-800/5">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-cream-50">
                  <td className="px-4 py-3 font-medium text-crust-800">{c.name}</td>
                  <td className="px-4 py-3 text-crust-800/70">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-crust-800/70">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-crust-800/70">{c._count?.orders ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => handleDelete(c)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Customer" : "New Customer"}>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving…" : "Save Customer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
