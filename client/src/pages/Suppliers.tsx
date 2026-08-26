import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Supplier } from "../types";
import { Button, Card, EmptyState, Input, Label, Modal, Spinner } from "../components/ui";

const emptyForm = { name: "", contactName: "", email: "", phone: "", address: "" };

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get<Supplier[]>("/suppliers");
    setSuppliers(res.data);
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

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      contactName: s.contactName ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form);
      } else {
        await api.post("/suppliers", form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Remove "${s.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${s.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (!suppliers) {
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
          <h1 className="font-display text-2xl font-semibold text-crust-800">Suppliers</h1>
          <p className="text-sm text-crust-800/60">Who you buy ingredients from.</p>
        </div>
        <Button onClick={openCreate}>+ New Supplier</Button>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <EmptyState title="No suppliers yet" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="p-5">
              <h3 className="font-display text-lg font-semibold text-crust-800">{s.name}</h3>
              {s.contactName && <p className="text-sm text-crust-800/70">{s.contactName}</p>}
              <p className="mt-2 text-sm text-crust-800/60">{s.email}</p>
              <p className="text-sm text-crust-800/60">{s.phone}</p>
              <p className="text-sm text-crust-800/60">{s.address}</p>
              <p className="mt-2 text-xs text-crust-800/40">{s._count?.ingredients ?? 0} ingredients supplied</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => openEdit(s)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => handleDelete(s)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "New Supplier"}>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving…" : "Save Supplier"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
