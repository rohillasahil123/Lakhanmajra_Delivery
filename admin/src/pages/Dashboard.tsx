import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getPermissions } from '../auth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type KPI = {
  title: string;
  value: string | number | null;
  hint?: string;
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [rangeDays, setRangeDays] = useState<number>(30); // default 30d per your choice
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const hasPerm = (p: string) => permissions.includes(p);

  useEffect(() => {
    (async () => setPermissions(await getPermissions()))();
  }, []);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  const fetchMetrics = async () => {
    if (!hasPerm('reports:view')) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/metrics?range=${rangeDays}`);
      setMetrics(res.data?.data ?? res.data);
    } catch (err) {
      console.error('Metrics fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) => {
    return Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
  };

  const kpis: KPI[] = [
    { title: 'Total orders', value: metrics?.totalOrders ?? '-' },
    { title: `Orders (last ${rangeDays}d)`, value: metrics?.ordersInRange ?? '-' },
    { title: 'Revenue (range)', value: metrics ? formatCurrency(metrics.revenue) : '-' },
    { title: 'Orders today', value: metrics?.ordersToday ?? '-' },
    { title: 'Pending orders', value: metrics?.pendingOrders ?? '-' },
    { title: 'Active users (range)', value: metrics?.activeUsers ?? '-' },
  ];

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

  if (!hasPerm('reports:view')) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
        <div className="bg-white p-6 rounded shadow">You do not have permission to view dashboard metrics.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setRangeDays(d)}
              className={`px-3 py-1 rounded ${rangeDays === d ? 'bg-indigo-600 text-white' : 'bg-white border'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {kpis.map((k, i) => (
          <div key={k.title} className="bg-white p-4 rounded shadow flex flex-col">
            <div className="text-sm text-slate-500">{k.title}</div>
            <div className="text-2xl font-bold mt-2">{k.value ?? '-'}</div>
            {k.hint && <div className="text-xs text-slate-400 mt-2">{k.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Orders — last {rangeDays} days</div>
            <div className="text-xs text-slate-400">{loading ? 'Loading…' : ''}</div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={metrics?.ordersByDay ?? []}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Revenue — last {rangeDays} days</div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={metrics?.revenueByDay ?? []}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm font-medium mb-2">Order status breakdown</div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={metrics?.statusBreakdown ?? []} dataKey="count" nameKey="status" outerRadius={80} label>
                  {(metrics?.statusBreakdown ?? []).map((entry: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm font-medium mb-2">Top products (by qty)</div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={metrics?.topProducts ?? []} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <Tooltip />
                <Bar dataKey="qty" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm font-medium mb-2">Rider performance</div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={metrics?.riderPerformance ?? []} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <Tooltip />
                <Bar dataKey="delivered" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
