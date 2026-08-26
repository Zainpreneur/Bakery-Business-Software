import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/orders", label: "Orders & POS", icon: "🧾" },
  { to: "/products", label: "Products", icon: "🥐" },
  { to: "/ingredients", label: "Inventory", icon: "🌾" },
  { to: "/suppliers", label: "Suppliers", icon: "🚚" },
  { to: "/customers", label: "Customers", icon: "👥" },
  { to: "/expenses", label: "Expenses", icon: "💵" },
  { to: "/users", label: "Team", icon: "🔑", adminOnly: true },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-cream-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-crust-800/10 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-2xl">🥖</span>
          <div>
            <p className="font-display text-lg font-semibold leading-tight text-crust-800">Crumb & Co.</p>
            <p className="text-[11px] text-crust-800/50">Bakery Manager</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems
            .filter((item) => !item.adminOnly || user?.role === "ADMIN")
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-crust-700 text-white"
                      : "text-crust-800/70 hover:bg-cream-100 hover:text-crust-800"
                  )
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-crust-800/10 p-4">
          <p className="truncate text-sm font-medium text-crust-800">{user?.name}</p>
          <p className="truncate text-xs text-crust-800/50">
            {user?.email} · {user?.role}
          </p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg bg-cream-100 py-1.5 text-xs font-medium text-crust-800/70 hover:bg-cream-200"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
