import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import type { DashboardSummary } from "../types";
import { Card, Spinner, StatCard, money } from "../components/ui";

export function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api.get<DashboardSummary>("/dashboard/summary").then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-crust-800">Good day! 👋</h1>
        <p className="text-sm text-crust-800/60">Here's how the bakery is doing.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue Today" value={money(data.revenueToday)} sub={`${data.ordersTodayCount} orders`} />
        <StatCard label="Revenue This Week" value={money(data.revenueWeek)} accent="blue" />
        <StatCard label="Revenue This Month" value={money(data.revenueMonth)} accent="green" />
        <StatCard
          label="Low Stock Items"
          value={String(data.lowStockCount)}
          sub="need reordering"
          accent={data.lowStockCount > 0 ? "red" : "amber"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-base font-semibold text-crust-800">
            Revenue — last 30 days
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenueTrend}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e08a2c" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#e08a2c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e6cf" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => d.slice(5)}
                tick={{ fontSize: 11, fill: "#8a5a2b" }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 11, fill: "#8a5a2b" }} width={40} />
              <Tooltip
                formatter={(v) => money(Number(v))}
                labelStyle={{ color: "#543518" }}
                contentStyle={{ borderRadius: 8, borderColor: "#f3e6cf", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#e08a2c" fill="url(#revenueFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-crust-800">Top Products (30d)</h2>
          {data.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-crust-800/50">No sales yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topProducts} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 11, fill: "#543518" }}
                />
                <Tooltip formatter={(v) => `${v} sold`} />
                <Bar dataKey="qty" fill="#8a5a2b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-crust-800">⚠️ Low Stock Ingredients</h2>
          </div>
          {data.lowStockIngredients.length === 0 ? (
            <p className="text-sm text-crust-800/50">All ingredients are well stocked.</p>
          ) : (
            <ul className="divide-y divide-crust-800/5">
              {data.lowStockIngredients.map((ing) => (
                <li key={ing.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-crust-800">{ing.name}</span>
                  <span className="text-red-600">
                    {ing.quantityInStock} {ing.unit} left (reorder at {ing.reorderThreshold} {ing.unit})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-crust-800">Business Snapshot</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-crust-800/60">Pending / active orders</dt>
              <dd className="font-medium text-crust-800">{data.pendingOrders}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-crust-800/60">Total customers</dt>
              <dd className="font-medium text-crust-800">{data.customerCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-crust-800/60">Expenses this month</dt>
              <dd className="font-medium text-crust-800">{money(data.expensesMonth)}</dd>
            </div>
            <div className="flex justify-between border-t border-crust-800/10 pt-2">
              <dt className="text-crust-800/60">Net (est.) this month</dt>
              <dd className="font-semibold text-crust-800">
                {money(data.revenueMonth - data.expensesMonth)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
