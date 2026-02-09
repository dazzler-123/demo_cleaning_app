import { useEffect, useState } from 'react';
import { assignmentsApi } from '@/api/endpoints';
import type { Assignment } from '@/types';
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
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import Pagination from '@mui/material/Pagination';
import InboxIcon from '@mui/icons-material/Inbox';
import { getStatusColor } from '@/utils/statusColors';
import SearchIcon from '@mui/icons-material/Search';

export default function AssignmentsList() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssignments = () => {
    setLoading(true);
    setError('');
    assignmentsApi
      .list({
        page,
        limit,
        status: status || undefined,
        search: debouncedSearch || undefined,
      })
      .then((res) => {
        setAssignments(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAssignments();
  }, [page, status, debouncedSearch]);

  useEffect(() => {
    const value = search.trim();
    if (value.length === 0 || value.length >= 3) {
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const getLeadName = (assignment: Assignment) => {
    if (typeof assignment.leadId === 'object' && assignment.leadId) {
      return assignment.leadId.client?.companyName || assignment.leadId.client?.contactPerson || '—';
    }
    return '—';
  };

  const getLeadContact = (assignment: Assignment) => {
    if (typeof assignment.leadId === 'object' && assignment.leadId) {
      return assignment.leadId.client?.contactPerson || '—';
    }
    return '—';
  };

  const getAgentName = (assignment: Assignment) => {
    if (typeof assignment.agentId === 'object' && assignment.agentId) {
      if (typeof assignment.agentId.userId === 'object' && assignment.agentId.userId) {
        return assignment.agentId.userId.name || '—';
      }
    }
    return '—';
  };

  const getQuotedAmount = (assignment: Assignment) => {
    if (typeof assignment.leadId === 'object' && assignment.leadId) {
      return assignment.leadId.quotedAmount;
    }
    return undefined;
  };

  const getConfirmedAmount = (assignment: Assignment) => {
    if (typeof assignment.leadId === 'object' && assignment.leadId) {
      return assignment.leadId.confirmedAmount;
    }
    return undefined;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <Box>
      <PageHeader
        title="Assignment Tasks"
        // subtitle="View and manage all task assignments"
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2, pb: 0, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by company, contact, or agent..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{ flex: { sm: '1 1 300px' }, minWidth: { xs: '100%', sm: 300 } }}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 180, flexShrink: 0 }}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="rescheduled">Rescheduled</MenuItem>
            <MenuItem value="on_hold">On Hold</MenuItem>
          </TextField>
        </Stack>
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        ) : assignments.length === 0 ? (
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
                No assignments found
              </Typography>
              <Typography variant="body2" color="text.secondary">
              {debouncedSearch || status ? 'Try adjusting your filters' : 'No assignments have been created yet'}
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
                      <TableCell>Quoted Amount</TableCell>
                      <TableCell>Confirmed Amount</TableCell>
                      <TableCell>Agent</TableCell>
                      <TableCell>Assigned Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Completed Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow
                        key={assignment._id}
                        sx={{
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{getLeadName(assignment)}</TableCell>
                        <TableCell>{getLeadContact(assignment)}</TableCell>
                        <TableCell>
                          {getQuotedAmount(assignment) !== undefined && getQuotedAmount(assignment) !== null
                            ? `$${getQuotedAmount(assignment)!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {getConfirmedAmount(assignment) !== undefined && getConfirmedAmount(assignment) !== null
                            ? `$${getConfirmedAmount(assignment)!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </TableCell>
                        <TableCell>{getAgentName(assignment)}</TableCell>
                        <TableCell>{assignment.assignedAt ? formatDateTime(assignment.assignedAt) : '—'}</TableCell>
                        <TableCell>
                          <Typography sx={{ color: getStatusColor(assignment.status), fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                            {assignment.status.replace('_', ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>{assignment.completedAt ? formatDateTime(assignment.completedAt) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </CompactTable>
              </Box>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Stack spacing={2}>
                  {assignments.map((assignment) => (
                    <Paper
                      key={assignment._id}
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
                            {getLeadName(assignment)}
                          </Typography>
                          <Typography sx={{ color: getStatusColor(assignment.status), fontWeight: 500, textTransform: 'capitalize' }}>
                            {assignment.status.replace('_', ' ')}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Contact
                          </Typography>
                          <Typography variant="body2">{getLeadContact(assignment)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Quoted Amount
                          </Typography>
                          <Typography variant="body2">
                            {getQuotedAmount(assignment) !== undefined && getQuotedAmount(assignment) !== null
                              ? `$${getQuotedAmount(assignment)!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Confirmed Amount
                          </Typography>
                          <Typography variant="body2">
                            {getConfirmedAmount(assignment) !== undefined && getConfirmedAmount(assignment) !== null
                              ? `$${getConfirmedAmount(assignment)!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Agent
                          </Typography>
                          <Typography variant="body2">{getAgentName(assignment)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Assigned Date
                          </Typography>
                          <Typography variant="body2">{assignment.assignedAt ? formatDateTime(assignment.assignedAt) : '—'}</Typography>
                        </Box>
                        {assignment.completedAt && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Completed Date
                            </Typography>
                            <Typography variant="body2">{formatDateTime(assignment.completedAt)}</Typography>
                          </Box>
                        )}
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
    </Box>
  );
}

