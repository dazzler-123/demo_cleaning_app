import { useEffect, useState } from 'react';
import { schedulesApi } from '@/api/endpoints';
import type { Schedule } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CompactTable from '@/components/CompactTable';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import Pagination from '@mui/material/Pagination';
import { getStatusColor } from '@/utils/statusColors';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchIcon from '@mui/icons-material/Search';

export default function ScheduledTasksList() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSchedules = () => {
    setLoading(true);
    setError('');
    const params: { page: number; limit: number; fromDate?: string; toDate?: string } = {
      page,
      limit,
    };
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    
    schedulesApi
      .list(params)
      .then((res) => {
        setSchedules(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedules();
  }, [page, fromDate, toDate]);

  const getLeadName = (schedule: Schedule) => {
    if (typeof schedule.leadId === 'object' && schedule.leadId) {
      return schedule.leadId.client?.companyName || schedule.leadId.client?.contactPerson || '—';
    }
    return '—';
  };

  const getLeadContact = (schedule: Schedule) => {
    if (typeof schedule.leadId === 'object' && schedule.leadId) {
      return schedule.leadId.client?.contactPerson || '—';
    }
    return '—';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeSlot = (timeSlot: string) => {
    return timeSlot;
  };

  return (
    <Box>
      <PageHeader
        title="Scheduled Tasks"
        subtitle="View and manage all scheduled cleaning tasks"
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CalendarTodayIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Manage scheduled tasks and their details
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2 }}>
          <TextField
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
            size="small"
          />
          <TextField
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
            size="small"
          />
        </Stack>
      </Card>

      {loading ? (
        <Card>
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        </Card>
      ) : (
        <Card>
          {schedules.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                gap: 1,
              }}
            >
              <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                No scheduled tasks found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fromDate || toDate ? 'Try adjusting your date filters' : 'No schedules have been created yet'}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop Table View */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <CompactTable>
                  <TableHead>
                    <TableRow>
                      <TableCell>Company</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Scheduled Date</TableCell>
                      <TableCell>Time Slot</TableCell>
                      <TableCell>Duration (hours)</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow
                        key={schedule._id}
                        sx={{
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{getLeadName(schedule)}</TableCell>
                        <TableCell>{getLeadContact(schedule)}</TableCell>
                        <TableCell>{formatDate(schedule.date)}</TableCell>
                        <TableCell>{formatTimeSlot(schedule.timeSlot)}</TableCell>
                        <TableCell>{schedule.duration}</TableCell>
                        <TableCell>
                          <Typography sx={{ color: getStatusColor(typeof schedule.leadId === 'object' && schedule.leadId ? schedule.leadId.status : ''), fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                            {typeof schedule.leadId === 'object' && schedule.leadId ? schedule.leadId.status.replace('_', ' ') : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </CompactTable>
              </Box>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Stack spacing={2}>
                  {schedules.map((schedule) => (
                    <Paper
                      key={schedule._id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: '0 2px 8px rgba(26, 77, 140, 0.1)',
                        },
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="h6" fontWeight={600}>
                            {getLeadName(schedule)}
                          </Typography>
                          <Typography sx={{ color: getStatusColor(typeof schedule.leadId === 'object' && schedule.leadId ? schedule.leadId.status : ''), fontWeight: 500, textTransform: 'capitalize' }}>
                            {typeof schedule.leadId === 'object' && schedule.leadId ? schedule.leadId.status.replace('_', ' ') : '—'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Contact
                          </Typography>
                          <Typography variant="body2">{getLeadContact(schedule)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Scheduled Date
                          </Typography>
                          <Typography variant="body2">{formatDate(schedule.date)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Time Slot
                            </Typography>
                            <Typography variant="body2">{formatTimeSlot(schedule.timeSlot)}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Duration
                            </Typography>
                            <Typography variant="body2">{schedule.duration} hours</Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </>
          )}
          {total > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, mb: 1 }}>
              <Pagination
                count={Math.ceil(total / limit)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                size="medium"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}
