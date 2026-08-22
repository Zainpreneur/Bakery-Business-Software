import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { AuthUser, Role } from "../types";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", email: "", password: "", role: "STAFF" as Role };

export function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get<AuthUser[]>("/users");
    setUsers(res.data);
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
      await api.post("/users", form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: AuthUser) {
    await api.put(`/users/${u.id}`, { active: !u.active });
    await load();
  }

  async function changeRole(u: AuthUser, role: Role) {
    await api.put(`/users/${u.id}`, { role });
    await load();
  }

  async function handleDelete(u: AuthUser) {
    if (!confirm(`Remove team member "${u.name}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (!users) {
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
          <h1 className="font-display text-2xl font-semibold text-crust-800">Team</h1>
          <p className="text-sm text-crust-800/60">Manage staff accounts and permissions.</p>
        </div>
        <Button onClick={openCreate}>+ New Team Member</Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <EmptyState title="No team members" />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-crust-800/10 text-xs uppercase tracking-wide text-crust-800/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crust-800/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-cream-50">
                  <td className="px-4 py-3 font-medium text-crust-800">{u.name}</td>
                  <td className="px-4 py-3 text-crust-800/70">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      className="!w-32"
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="STAFF">Staff</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={u.active ? "COMPLETED" : "CANCELLED"} label={u.active ? "Active" : "Disabled"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => toggleActive(u)}>
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                      {u.id !== me?.id && (
                        <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => handleDelete(u)}>
                          Delete
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Team Member">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.email || form.password.length < 6}>
              {saving ? "Saving…" : "Create Account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
