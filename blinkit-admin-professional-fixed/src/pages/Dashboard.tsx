import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  DollarSign,
  Package,
  Clock
} from 'lucide-react';
import api from '../api/client';
import { getPermissions } from '../auth';
import { formatCurrency } from '../utils/helpers';
import Loading from '../components/Loading';
import type { DashboardMetrics } from '../types';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const hasPerm = (p: string) => permissions.includes(p);

  useEffect(() => {
    (async () => {
      const perms = await getPermissions();
      setPermissions(perms);
    })();
  }, []);

  useEffect(() => {
    if (hasPerm('reports:view')) {
      fetchMetrics();
    }
  }, [rangeDays, permissions]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/metrics?range=${rangeDays}`);
      setMetrics(res.data?.data ?? res.data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPerm('reports:view')) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            You don't have permission to view dashboard metrics.
          </p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Orders',
      value: metrics?.totalOrders ?? '-',
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: `Orders (${rangeDays}d)`,
      value: metrics?.ordersInRange ?? '-',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Revenue',
      value: metrics ? formatCurrency(metrics.revenue) : '-',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Today\'s Orders',
      value: metrics?.ordersToday ?? '-',
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Pending Orders',
      value: metrics?.pendingOrders ?? '-',
      icon: Package,
      color: 'from-red-500 to-red-600',
    },
    {
      title: 'Active Users',
      value: metrics?.activeUsers ?? '-',
      icon: Users,
      color: 'from-cyan-500 to-cyan-600',
    },
  ];

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setRangeDays(d)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                rangeDays === d
                  ? 'bg-blinkit-green text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loading size="lg" text="Loading dashboard..." />
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {kpi.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {kpi.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Chart */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Orders Trend
              </h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={metrics?.ordersByDay ?? []}>
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#54b226" 
                      strokeWidth={3}
                      dot={{ fill: '#54b226', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Revenue Trend
              </h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={metrics?.revenueByDay ?? []}>
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Status Breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Status
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={metrics?.statusBreakdown ?? []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => entry.status}
                    >
                      {(metrics?.statusBreakdown ?? []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Products
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={metrics?.topProducts ?? []} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rider Performance */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Rider Performance
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={metrics?.riderPerformance ?? []} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="delivered" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
