import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, leadsApi, type DashboardOverview } from '@/api/endpoints';
import type { Lead } from '@/types';
import PageHeader from '@/components/PageHeader';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@/components/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CompactTable, { TABLE_FONT_FAMILY } from '@/components/CompactTable';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WorkIcon from '@mui/icons-material/Work';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import InboxIcon from '@mui/icons-material/Inbox';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

import { STATUS_COLORS, getStatusColor } from '@/utils/statusColors';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [completedLeads, setCompletedLeads] = useState<Lead[]>([]);
  const [completedLeadsLoading, setCompletedLeadsLoading] = useState(false);

  useEffect(() => {
    // Skip loading if custom range is selected but dates are not filled
    if (dateRange === 'custom' && (!customFromDate || !customToDate)) {
      return;
    }

    setLoading(true);
    const params: { days?: number; fromDate?: string; toDate?: string } = {};
    
    if (dateRange === 'custom') {
      params.fromDate = customFromDate;
      params.toDate = customToDate;
    } else {
      params.days = Number(dateRange);
    }

    dashboardApi
      .overview(params)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dateRange, customFromDate, customToDate]);

  useEffect(() => {
    setCompletedLeadsLoading(true);
    leadsApi
      .list({ status: 'completed', limit: 10, page: 1 })
      .then((res) => setCompletedLeads(res.data.items))
      .catch(() => setCompletedLeads([]))
      .finally(() => setCompletedLeadsLoading(false));
  }, []);

  if (loading) {
    return (
      <Box>
        <PageHeader title="Dashboard" subtitle="Loading dashboard data..." />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #E0E0E0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
        </Box>
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

  const {
    leads,
    assignments,
    agents,
    slaCompliance,
    jobTrends,
    leadsByDay = [],
    leadsScheduledToday,
    leadsAssignedToday,
    jobsInProgress,
    jobsCompleted,
    agentWorkload = [],
    leadsByType = [],
  } = data;

  const statusCount = (arr: { _id: string; count: number }[], id: string) =>
    arr.find((x) => x._id === id)?.count ?? 0;

  const getDaysToShow = () => {
    if (dateRange === 'custom') {
      if (customFromDate && customToDate) {
        const from = new Date(customFromDate);
        const to = new Date(customToDate);
        const diffTime = Math.abs(to.getTime() - from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.min(diffDays, 90);
      }
      return 30;
    }
    return Number(dateRange) || 30;
  };

  const daysToShow = getDaysToShow();
  const leadsByTimeChart = leadsByDay.slice(-daysToShow).map((d) => ({
    date: d._id,
    leads: d.count,
    cancelled: d.cancelled || 0,
  }));

  const jobTrendsChart = jobTrends.slice(-Math.min(daysToShow, 14)).map((d) => ({
    date: d._id,
    total: d.total,
    completed: d.completed,
    pending: d.total - d.completed,
  }));

  const leadsPieData = leads.byStatus
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s._id.charAt(0).toUpperCase() + s._id.slice(1), value: s.count, status: s._id }));

  const leadTypeColors: Record<string, string> = {
    facebook: '#1877F2',
    instagram: '#E4405F',
    google: '#4285F4',
    website: '#34A853',
    referral: '#FF9800',
    walk_in: '#9C27B0',
    phone_call: '#00BCD4',
    email: '#F44336',
    other: '#607D8B',
  };

  const formatLeadTypeName = (type: string | null) => {
    if (!type) return 'Not Specified';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const leadsByTypePieData = leadsByType
    .filter((t) => t.count > 0)
    .map((t) => ({
      name: formatLeadTypeName(t._id),
      value: t.count,
      type: t._id || 'other',
    }));

  const assignmentsBarData = assignments.byStatus.map((s) => ({
    status: s._id.replace('_', ' '),
    statusId: s._id,
    count: s.count,
  }));

  const KPI_TEMPLATE_COLORS = {
    orange: '#FF9F43',
    red: '#EA5455',
    green: '#28C76F',
    blue: '#3C8DFF',
    dark: '#333333',
  };

  const kpiCards = [
    {
      label: 'Total Leads',
      value: leads.total,
      icon: <PeopleIcon />,
      color: KPI_TEMPLATE_COLORS.orange,
      footerBar: `${statusCount(leads.byStatus, 'created')} created · ${statusCount(leads.byStatus, 'completed')} completed`,
      trend: 'up' as const,
    },
    {
      label: 'Scheduled Today',
      value: leadsScheduledToday ?? '—',
      icon: <ScheduleIcon />,
      color: KPI_TEMPLATE_COLORS.red,
      footerBar: `${leadsScheduledToday ?? 0} leads today`,
      trend: 'up' as const,
    },
    {
      label: 'Assigned Today',
      value: leadsAssignedToday ?? '—',
      icon: <AssignmentIcon />,
      color: KPI_TEMPLATE_COLORS.green,
      footerBar: `${leadsAssignedToday ?? 0} assigned`,
      trend: 'up' as const,
    },
    {
      label: 'Active Agents',
      value: agents.total,
      icon: <PersonIcon />,
      color: KPI_TEMPLATE_COLORS.dark,
      footerBar: `Available: ${agents.available} · Busy: ${agents.busy}`,
      trend: null as null,
    },
  ];

  const getDateRangeLabel = () => {
    if (dateRange === 'custom') {
      if (customFromDate && customToDate) {
        return `${new Date(customFromDate).toLocaleDateString()} - ${new Date(customToDate).toLocaleDateString()}`;
      }
      return 'Custom range';
    }
    return DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange)?.label || 'Last 30 days';
  };

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Operational KPIs and analytics"
        icon={<BarChartIcon sx={{ fontSize: 32 }} />}
        action={
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            {/* Date Range Filter – compact */}
            <Paper
              elevation={0}
              sx={{
                p: 1,
                borderRadius: 1,
                border: '1px solid #E0E0E0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  sx={{
                    minWidth: 110,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.default',
                      fontSize: '0.8125rem',
                      '& .MuiSelect-select': { py: 0.5 },
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
                        minWidth: 115,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'background.default',
                          fontSize: '0.8125rem',
                          '& .MuiInputBase-input': { py: 0.5 },
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
                         minWidth: 115,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'background.default',
                          fontSize: '0.8125rem',
                          '& .MuiInputBase-input': { py: 0.5 },
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
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    backgroundColor: 'primary.main',
                    color: '#FFFFFF',
                  }}
                />
              )}
            </Paper>
          </Stack>
        }
      />

      {/* KPI Cards – template: label, large value (28–32px), icon top-right, solid footer + trend */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Paper
              elevation={0}
              sx={{
                p: 0,
                borderRadius: '10px',
                border: '1px solid #E7E9F0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                height: '100%',
                transition: 'all 0.2s',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
              }}
            >
              <Box sx={{ p: 2.5, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {kpi.label}
                  </Typography>
                  <Box
                    sx={{
                      p: 0.75,
                      borderRadius: '50%',
                      backgroundColor: `${kpi.color}22`,
                      color: kpi.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {kpi.icon}
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: kpi.color, lineHeight: 1.2 }}>
                  {kpi.value}
                </Typography>
              </Box>
              <Box
                sx={{
                  py: 0.875,
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: kpi.color,
                  color: '#FFFFFF',
                }}
              >
                {kpi.trend === 'up' && <TrendingUpIcon sx={{ fontSize: 16, opacity: 0.95 }} />}
                {kpi.trend === 'down' && <TrendingDownIcon sx={{ fontSize: 16, opacity: 0.95 }} />}
                <Typography variant="caption" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#FFFFFF' }}>
                  {kpi.footerBar}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Leads per day – light bg, line chart */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 0,
              borderRadius: '10px',
              border: '1px solid #E7E9F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              transition: 'all 0.2s',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#333333' }}>
                  Leads Per Day
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUpIcon sx={{ fontSize: 18, color: '#28C76F' }} />
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#28C76F' }}>
                  {leadsByTimeChart.length ? Math.round(leadsByTimeChart.reduce((a, d) => a + d.leads, 0) / Math.max(leadsByTimeChart.length, 1)) : 0} avg
                </Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: '#FAFAFA', px: 1, pt: 0.5, pb: 1 }}>
              {leadsByTimeChart.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 1 }}>
                  <InboxIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>No leads data</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={leadsByTimeChart} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#666666', fontSize: 11 }} tickFormatter={(v: string) => (v ? v.slice(5) : '')} />
                    <YAxis tick={{ fill: '#666666', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                      formatter={(value: number | undefined, name: string) => {
                        const label = name === 'leads' ? 'Total Leads' : name === 'cancelled' ? 'Cancelled' : name;
                        return [value ?? 0, label];
                      }}
                      labelFormatter={(label: string) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="leads" name="Total Leads" stroke="#3474F2" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke={STATUS_COLORS.cancelled || '#F44336'} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 3, borderTop: '1px solid #E7E9F0' }}>
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', color: '#4A4A4A' }}>Total Leads</Typography>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#333333' }}>
                  {leadsByTimeChart.reduce((a, d) => a + d.leads, 0)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', color: '#4A4A4A' }}>Total Cancelled</Typography>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: STATUS_COLORS.cancelled || '#F44336' }}>
                  {leadsByTimeChart.reduce((a, d) => a + (d.cancelled || 0), 0)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Job trends - Area chart */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              height: { xs: 300, sm: 360 },
              transition: 'all 0.3s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(26, 77, 140, 0.1)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BarChartIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
              <Typography variant={{ xs: 'body2', sm: 'subtitle1' }} fontWeight={600}>
                Job trends ({dateRange === 'custom' ? getDateRangeLabel().toLowerCase() : `last ${Math.min(Number(dateRange) || 14, 14)} days`})
            </Typography>
            </Box>
            {jobTrendsChart.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: { xs: 220, sm: 280 },
                  gap: 1,
                }}
              >
                <BarChartIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'text.disabled', opacity: 0.5 }} />
                <Typography color="text.secondary" variant="body2">
                  No job trends data available
            </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 600 ? 220 : 300}>
                <AreaChart data={jobTrendsChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STATUS_COLORS.pending} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={STATUS_COLORS.pending} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STATUS_COLORS.completed} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={STATUS_COLORS.completed} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: 'divider' }}
                    formatter={(value: number | undefined) => [value ?? 0, '']}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    name="Pending"
                    stroke={STATUS_COLORS.pending}
                    fillOpacity={1}
                    fill="url(#colorPending)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
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

        {/* SLA Compliance */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid #E0E0E0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              transition: 'all 0.2s',
              '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" color="text.secondary">
              SLA Compliance
            </Typography>
            </Box>
            <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Background circle - full track (light gray) */}
              <CircularProgress
                variant="determinate"
                value={100}
                size={120}
                thickness={4}
                sx={{
                  position: 'absolute',
                  color: '#E7E9F0',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              {/* Foreground circle - actual progress (navy) */}
              <CircularProgress
                variant="determinate"
                value={slaCompliance.compliance}
                size={120}
                thickness={4}
                sx={{
                  color: '#333333',
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
            <Typography variant="h4" fontWeight={700}>
              {slaCompliance.compliance}%
            </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {slaCompliance.completed}/{slaCompliance.total}
            </Typography>
                  </Box>
                </Box>
              </Paper>
        </Grid>
      </Grid>

      {/* Pie Charts Row - Leads by status and Leads by type */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Leads by status */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid #E0E0E0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              height: { xs: 280, sm: 320 },
              transition: 'all 0.2s',
              '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PieChartIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={600}>
                    Leads by status
        </Typography>
            </Box>
            {leadsPieData.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: { xs: 200, sm: 240 },
                  gap: 1,
                }}
              >
                    <PieChartIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.5 }} />
                    <Typography color="text.secondary" variant="body2">
                      No data
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 600 ? 200 : 240}>
                    <PieChart>
                      <Pie
                        data={leadsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={1}
                        dataKey="value"
                        nameKey="name"
                        label={({
                          cx,
                          cy,
                          midAngle,
                          outerRadius,
                          name,
                          percent,
                        }: {
                          cx: number;
                          cy: number;
                          midAngle: number;
                          outerRadius: number;
                          name: string;
                          percent: number;
                        }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 10;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          const pct = (percent * 100).toFixed(1);
                          const labelText = `${name} ${pct}%`;
                          const labelX = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
                          const labelY = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
                          return (
                            <g>
                              <line
                                x1={cx + outerRadius * Math.cos(-midAngle * RADIAN)}
                                y1={cy + outerRadius * Math.sin(-midAngle * RADIAN)}
                                x2={labelX}
                                y2={labelY}
                                stroke="currentColor"
                                strokeWidth={1}
                              />
                              <text
                                x={x}
                                y={y}
                                fill="currentColor"
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                style={{ fontSize: 11 }}
                              >
                                {labelText}
                              </text>
                            </g>
                          );
                        }}
                      >
                        {leadsPieData.map((entry, i) => (
                          <Cell key={i} fill={getStatusColor(entry.status)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: 'divider' }}
                        formatter={(value: number | undefined) => [value ?? 0, 'Leads']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            {/* Leads by type */}
            <Grid item xs={12} sm={6}>
              <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid #E0E0E0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              height: { xs: 280, sm: 320 },
              transition: 'all 0.2s',
              '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
            }}
          >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PieChartIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Leads by type
                  </Typography>
                </Box>
                {leadsByTypePieData.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: { xs: 200, sm: 240 },
                      gap: 1,
                    }}
                  >
                    <PieChartIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.5 }} />
                    <Typography color="text.secondary" variant="body2">
                      No data
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 600 ? 200 : 240}>
                    <PieChart>
                      <Pie
                        data={leadsByTypePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={1}
                        dataKey="value"
                        nameKey="name"
                        label={({
                          cx,
                          cy,
                          midAngle,
                          outerRadius,
                          name,
                          percent,
                        }: {
                          cx: number;
                          cy: number;
                          midAngle: number;
                          outerRadius: number;
                          name: string;
                          percent: number;
                        }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 10;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          const pct = (percent * 100).toFixed(1);
                          const labelText = `${name} ${pct}%`;
                          const labelX = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
                          const labelY = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
                          return (
                            <g>
                              <line
                                x1={cx + outerRadius * Math.cos(-midAngle * RADIAN)}
                                y1={cy + outerRadius * Math.sin(-midAngle * RADIAN)}
                                x2={labelX}
                                y2={labelY}
                                stroke="currentColor"
                                strokeWidth={1}
                              />
                              <text
                                x={x}
                                y={y}
                                fill="currentColor"
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                style={{ fontSize: 11 }}
                              >
                                {labelText}
                              </text>
                            </g>
                          );
                        }}
                      >
                        {leadsByTypePieData.map((entry, i) => (
                          <Cell key={i} fill={leadTypeColors[entry.type] || leadTypeColors.other} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: 'divider' }}
                        formatter={(value: number | undefined) => [value ?? 0, 'Leads']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
      </Grid>

      {/* Assignments and Agent Workload Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Assignments bar chart */}
        <Grid item xs={12} lg={6}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              border: '1px solid #E0E0E0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              height: { xs: 280, sm: 320 },
              transition: 'all 0.2s',
              '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BarChartIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
              <Typography variant={{ xs: 'body2', sm: 'subtitle1' }} fontWeight={600}>
                Assignments by status ({getDateRangeLabel().toLowerCase()})
              </Typography>
            </Box>
            {assignmentsBarData.length === 0 ? (
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
                <BarChartIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'text.disabled', opacity: 0.5 }} />
                <Typography color="text.secondary" variant="body2">
                  No assignments data available
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 600 ? 200 : 260}>
                <BarChart data={assignmentsBarData} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="status" type="category" width={55} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: 'divider' }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Count']}
                  />
                  <Bar dataKey="count" name="Assignments" radius={[0, 4, 4, 0]}>
                    {assignmentsBarData.map((entry, i) => (
                      <Cell key={i} fill={getStatusColor(entry.statusId)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Agent workload table */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid #E0E0E0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              height: 320,
              transition: 'all 0.2s',
              '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Agent workload (active jobs)
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <CompactTable containerSx={{ maxHeight: 260 }} stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    {/* <TableCell>Mobile</TableCell> */}
                    <TableCell align="right">Active jobs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agentWorkload.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ py: 3, fontSize: '0.875rem', color: '#666666' }}>
                        No active assignments
                      </TableCell>
                    </TableRow>
                  ) : (
                    agentWorkload.map((row, i) => (
                      <TableRow key={row.agentId ?? i} hover>
                        <TableCell>{row.agentName ?? row.agentId ?? '—'}</TableCell>
                        {/* <TableCell>{row.agentPhone ?? '—'}</TableCell> */}
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </CompactTable>
            </Box>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={1.5}>
                {agentWorkload.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    No active assignments
                  </Typography>
                ) : (
                  agentWorkload.map((row, i) => (
                    <Paper
                      key={row.agentId ?? i}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        border: '1px solid #E0E0E0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {row.agentName ?? row.agentId ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.agentPhone ?? '—'}
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700}>
                          {row.count}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Latest Completed Leads */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          mb: 3,
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(26, 77, 140, 0.1)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Latest Completed Leads
            </Typography>
          </Box>
          <Link to="/admin/leads?status=completed" style={{ textDecoration: 'none' }}>
            <Button
              size="sm"
              variant="secondary"
              style={{ fontSize: '0.75rem' }}
            >
              View All
            </Button>
          </Link>
        </Box>
        {completedLeadsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : completedLeads.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No completed leads yet
            </Typography>
          </Box>
        ) : (
          <CompactTable>
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Completed Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {completedLeads.map((lead) => (
                <TableRow key={lead._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500} sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                      {lead.client.companyName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                      {lead.client.contactPerson}
                    </Typography>
                    {lead.client.email && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {lead.client.email}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                      {lead.location.city}, {lead.location.pincode || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                      {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      component={Link}
                      to={`/admin/leads/${lead._id}/edit`}
                      color="primary"
                      sx={{ padding: 0.5 }}
                    >
                      <VisibilityIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </CompactTable>
        )}
      </Paper>

    </Box>
  );
}
