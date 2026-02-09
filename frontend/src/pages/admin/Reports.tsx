import { useEffect, useState } from 'react';
import { dashboardApi } from '@/api/endpoints';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { getStatusColor, STATUS_COLORS } from '@/utils/statusColors';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';

export default function Reports() {
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardApi.overview>>['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .overview({ days: 30 })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box>
        <PageHeader title="Reports & Analytics" subtitle="Loading reports data..." />
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }
  if (error)
    return (
      <Box>
        <PageHeader title="Reports & Analytics" subtitle="Error loading reports data" />
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  if (!data) return null;

  const { leads, assignments, agents, slaCompliance, jobTrends } = data;

  return (
    <Box>
      <PageHeader title="Reports & Analytics" subtitle="Last 30 days overview" />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(5, 23, 71, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Leads
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ color: STATUS_COLORS.created }}>
              {leads.total}
            </Typography>
            <List dense disablePadding>
              {leads.byStatus.map((s) => (
                <ListItem key={s._id} disablePadding>
                  <ListItemText
                    primary={`${s._id}: ${s.count}`}
                    primaryTypographyProps={{
                      variant: 'body2',
                      textTransform: 'capitalize',
                      sx: { color: getStatusColor(s._id), fontWeight: 500 },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Assignments
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {assignments.total}
            </Typography>
            <List dense disablePadding>
              {assignments.byStatus.map((s) => (
                <ListItem key={s._id} disablePadding>
                  <ListItemText
                    primary={`${s._id}: ${s.count}`}
                    primaryTypographyProps={{
                      variant: 'body2',
                      textTransform: 'capitalize',
                      sx: { color: getStatusColor(s._id), fontWeight: 500 },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(5, 23, 71, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Agents
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#051747' }}>
              {agents.total}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
                Available:{' '}
              </Typography>
              <Typography variant="body2" component="span" sx={{ color: '#22c55e', fontWeight: 500 }}>
                {agents.available}
              </Typography>
              <Typography variant="body2" component="span" sx={{ color: 'text.secondary', mx: 0.5 }}>
                ·
              </Typography>
              <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
                Busy:{' '}
              </Typography>
              <Typography variant="body2" component="span" sx={{ color: STATUS_COLORS.in_progress, fontWeight: 500 }}>
                {agents.busy}
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(5, 23, 71, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              SLA Compliance
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ color: STATUS_COLORS.completed }}>
              {slaCompliance.compliance}%
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="body2" component="span" sx={{ color: STATUS_COLORS.completed, fontWeight: 500 }}>
                {slaCompliance.completed}
              </Typography>
              <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
                completed / {slaCompliance.total} total
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
      <Card>
        <Typography variant="h6" gutterBottom>
          Job trends (last 14 days)
        </Typography>
        {jobTrends.length === 0 ? (
          <Typography color="text.secondary">No data yet</Typography>
        ) : (
          <Grid container spacing={2}>
            {jobTrends.slice(-14).map((d) => (
              <Grid item xs={12} sm={6} md={4} key={d._id}>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="subtitle2">{d._id}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
                      {d.total} jobs ·
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
                      {' '}
                      {d.completed}{' '}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ color: STATUS_COLORS.completed, fontWeight: 500 }}>
                      done
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Card>
    </Box>
  );
}
