import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Users,
  UsersRound,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { analyticsService } from '../services/analyticsService'

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await analyticsService.getAnalytics()
        setAnalytics(data)
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total Messages',
      value: analytics?.totalMessages?.toLocaleString() || '0',
      change: '+12.5%',
      icon: MessageSquare,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      title: 'Active Users',
      value: analytics?.activeUsers?.toLocaleString() || '0',
      change: '+8.2%',
      icon: Users,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      title: 'Chat Groups',
      value: analytics?.totalGroups?.toLocaleString() || '0',
      change: '+5.1%',
      icon: UsersRound,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
    {
      title: 'Avg Messages/Day',
      value: Math.round(
        (analytics?.messagesPerDay?.reduce((acc, d) => acc + d.count, 0) || 0) /
          (analytics?.messagesPerDay?.length || 1)
      ).toLocaleString(),
      change: '+15.3%',
      icon: TrendingUp,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="h-16 px-6 border-b flex items-center bg-card">
        <div>
          <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor your chat application performance</p>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-chart-2 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {stat.change} from last week
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Per Day */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>Messages Per Day</CardTitle>
              </div>
              <CardDescription>Daily message volume over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.messagesPerDay || []}>
                    <defs>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(date) =>
                        new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMessages)"
                      name="Messages"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Active Users Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle>Active Users Trend</CardTitle>
              </div>
              <CardDescription>User activity over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.activeUsersTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(date) =>
                        new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', strokeWidth: 2 }}
                      name="Active Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages by Type */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                <CardTitle>Messages by Type</CardTitle>
              </div>
              <CardDescription>Distribution of message types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics?.messagesByType || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="type"
                    >
                      {analytics?.messagesByType?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Groups */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UsersRound className="w-5 h-5 text-primary" />
                <CardTitle>Top Active Groups</CardTitle>
              </div>
              <CardDescription>Groups with most message activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.topGroups || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="messages" fill="#6366f1" radius={[0, 4, 4, 0]} name="Messages" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Activity by Hour */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>User Activity by Hour</CardTitle>
            </div>
            <CardDescription>Peak activity times throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.userActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Active Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
