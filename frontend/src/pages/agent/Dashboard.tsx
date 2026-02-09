import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, agentsApi } from '@/api/endpoints';
import type { AgentDashboardOverview } from '@/api/endpoints';
import type { Agent } from '@/types';
import PageHeader from '@/components/PageHeader';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { getStatusChipProps, STATUS_COLORS } from '@/utils/statusColors';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WorkIcon from '@mui/icons-material/Work';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];

export default function AgentDashboard() {
  const [data, setData] = useState<AgentDashboardOverview | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [availability, setAvailability] = useState<'available' | 'busy' | 'off_duty'>('available');
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  useEffect(() => {
    // Skip loading if custom range is selected but dates are not filled
    if (dateRange === 'custom' && (!customFromDate || !customToDate)) {
      return;
    }

    setLoading(true);
    const params: { fromDate?: string; toDate?: string; days?: number } = {};
    
    if (dateRange === 'custom') {
      params.fromDate = customFromDate;
      params.toDate = customToDate;
    } else {
      params.days = Number(dateRange);
    }

    Promise.all([
      dashboardApi.agentOverview(params),
      agentsApi.getMe(),
    ])
      .then(([overviewRes, agentRes]) => {
        setData(overviewRes.data);
        setAgent(agentRes.data);
        setAvailability((agentRes.data?.availability as 'available' | 'busy' | 'off_duty') ?? 'available');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dateRange, customFromDate, customToDate]);

  if (loading) {
    return (
      <Box>
        <PageHeader title="Dashboard" subtitle="Loading your dashboard..." />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error)
    return (
      <Box>
        <PageHeader title="Dashboard" subtitle="Error loading dashboard data" />
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );

  if (!data) return null;

  const handleAvailabilityChange = async (value: 'available' | 'busy' | 'off_duty') => {
    if (!agent) return;
    setAvailability(value);
    setAvailabilityError('');
    setAvailabilitySaving(true);
    try {
      await agentsApi.update(agent._id, { availability: value });
      setAgent((prev) => (prev ? { ...prev, availability: value } : prev));
    } catch (err) {
      setAvailabilityError(err instanceof Error ? err.message : 'Failed to update availability');
      setAvailability((agent?.availability as 'available' | 'busy' | 'off_duty') ?? 'available');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const { assignmentStats, taskTrends, completionRate } = data;

  const statusCount = (status: string) =>
    assignmentStats.byStatus.find((s) => s._id === status)?.count ?? 0;
  
  const pending = statusCount('pending');
  const inProgress = statusCount('in_progress');
  const completed = statusCount('completed');
  const total = assignmentStats.total;

  const getDateRangeLabel = () => {
    if (dateRange === 'custom') {
      if (customFromDate && customToDate) {
        return `${new Date(customFromDate).toLocaleDateString()} - ${new Date(customToDate).toLocaleDateString()}`;
      }
      return 'Custom range';
    }
    return DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange)?.label || 'Last 30 days';
  };

  // Create chart data from API response
  const taskTrendsChart = taskTrends.map((item) => ({
    date: item._id.slice(5), // MM-DD format
    assigned: item.assigned,
    completed: item.completed,
  }));

  const statusPieData = [
    { name: 'Completed', value: completed, status: 'completed' },
    { name: 'In Progress', value: inProgress, status: 'in_progress' },
    { name: 'Pending', value: pending, status: 'pending' },
  ].filter((item) => item.value > 0);

  const kpiCards = [
    {
      label: 'Total Tasks',
      value: total,
      icon: <AssignmentIcon />,
      color: '#051747',
    },
    {
      label: 'Pending',
      value: pending,
      icon: <ScheduleIcon />,
      color: STATUS_COLORS.pending,
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: <WorkIcon />,
      color: STATUS_COLORS.in_progress,
    },
    {
      label: 'Completed',
      value: completed,
      icon: <CheckCircleIcon />,
      color: STATUS_COLORS.completed,
    },
  ];

  const completionRateValue = completionRate.completionRate;

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${agent?.userId && typeof agent.userId === 'object' ? agent.userId.name : 'Agent'}`}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {/* Date Range Filter */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 1.5 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 1.5,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, fontWeight: 600 }}>
                  Date Range
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  select
                  size="small"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  sx={{
                    width: { xs: '100%', sm: 140 },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.default',
                    },
                  }}
                  variant="outlined"
                >
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
                {dateRange === 'custom' && (
                  <>
                    <TextField
                      type="date"
                      size="small"
                      label="From"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        width: { xs: '100%', sm: 140 },
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'background.default',
                        },
                      }}
                      variant="outlined"
                    />
                    <TextField
                      type="date"
                      size="small"
                      label="To"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        width: { xs: '100%', sm: 140 },
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'background.default',
                        },
                      }}
                      variant="outlined"
                    />
                  </>
                )}
              </Stack>
              {dateRange !== 'custom' && (
                <Chip
                  label={DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange)?.label || 'Last 30 days'}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: 'primary.main',
                    color: '#FFFFFF',
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                  }}
                />
              )}
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 1.5 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 1.5,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                width: { xs: '100%', sm: 'auto' },
                minWidth: { sm: 220 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Availability
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                value={availability}
                onChange={(e) => handleAvailabilityChange(e.target.value as 'available' | 'busy' | 'off_duty')}
                disabled={availabilitySaving}
                sx={{
                  width: { xs: '100%', sm: 160 },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.default',
                  },
                }}
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="busy">Busy</MenuItem>
                <MenuItem value="off_duty">Off duty</MenuItem>
              </TextField>
            </Paper>
            {availabilityError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {availabilityError}
              </Alert>
            )}
          </Stack>
        }
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <TrendingUpIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Your task overview and performance metrics · {getDateRangeLabel()}
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'rgba(0, 0, 0, 0.08)',
                height: '100%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${kpi.color}08 0%, #ffffff 100%)`,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                '&:hover': {
                  boxShadow: `0 8px 24px ${kpi.color}30`,
                  borderColor: kpi.color,
                  transform: 'translateY(-4px)',
                  background: `linear-gradient(135deg, ${kpi.color}15 0%, #ffffff 100%)`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '5px',
                  height: '100%',
                  background: `linear-gradient(180deg, ${kpi.color} 0%, ${kpi.color}dd 100%)`,
                  borderRadius: '12px 0 0 12px',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                  {kpi.label}
                </Typography>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${kpi.color} 0%, ${kpi.color}dd 100%)`,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    boxShadow: `0 4px 12px ${kpi.color}40`,
                    '&:hover': {
                      transform: 'scale(1.1) rotate(5deg)',
                      boxShadow: `0 6px 16px ${kpi.color}50`,
                    },
                  }}
                >
                  {kpi.icon}
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color: kpi.color }}>
                {kpi.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Task Trends Chart - Date-wise assigned and completed */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: { xs: 300, sm: 360 },
              transition: 'all 0.3s',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(5, 23, 71, 0.12)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TrendingUpIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
              <Typography variant={{ xs: 'body2', sm: 'subtitle1' }} fontWeight={600}>
                Task Trends ({getDateRangeLabel().toLowerCase()})
              </Typography>
            </Box>
            {taskTrendsChart.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: { xs: 220, sm: 300 },
                  gap: 1,
                }}
              >
                <TrendingUpIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'text.disabled', opacity: 0.5 }} />
                <Typography color="text.secondary" variant="body2">
                  No task data available
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 600 ? 220 : 300}>
                <AreaChart data={taskTrendsChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STATUS_COLORS.in_progress} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={STATUS_COLORS.in_progress} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STATUS_COLORS.completed} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={STATUS_COLORS.completed} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => (v ? v.slice(5) : '')} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: 'divider' }}
                    formatter={(value: number | undefined) => [value ?? 0, '']}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="assigned"
                    name="Tasks Assigned"
                    stroke={STATUS_COLORS.in_progress}
                    fillOpacity={1}
                    fill="url(#colorAssigned)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Tasks Completed"
                    stroke={STATUS_COLORS.completed}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Task Status Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 320,
              transition: 'all 0.3s',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(5, 23, 71, 0.12)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Task Status Distribution
              </Typography>
            </Box>
            {statusPieData.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: { xs: 200, sm: 260 },
                  gap: 1,
                }}
              >
                <AssignmentIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'text.disabled', opacity: 0.5 }} />
                <Typography color="text.secondary" variant="body2">
                  No tasks yet
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 600 ? 200 : 260}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={getStatusChipProps(entry.status).sx?.bgcolor || STATUS_COLORS.default} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: 'divider' }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Tasks']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Completion Rate */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: { xs: 280, sm: 320 },
              textAlign: 'center',
              transition: 'all 0.3s',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(5, 23, 71, 0.12)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <TrendingUpIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: 'primary.main' }} />
              <Typography variant={{ xs: 'caption', sm: 'subtitle2' }} color="text.secondary">
                Completion Rate
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mt: { xs: 1, sm: 2 } }}>
              <CircularProgress
                variant="determinate"
                value={100}
                size={{ xs: 120, sm: 160 }}
                thickness={4}
                sx={{
                  position: 'absolute',
                  color: '#E7E9F0',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              <CircularProgress
                variant="determinate"
                value={completionRateValue}
                size={160}
                thickness={4}
                sx={{
                  color: STATUS_COLORS.completed,
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h3" fontWeight={700} sx={{ color: STATUS_COLORS.completed }}>
                  {completionRateValue}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {completionRate.completed}/{completionRate.total} completed
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Keep up the great work!
            </Typography>
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
}
