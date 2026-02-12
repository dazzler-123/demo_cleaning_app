import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi } from '@/api/endpoints';
import type { Lead, LeadStatus } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CompactTable from '@/components/CompactTable';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { getStatusChipProps, getStatusColor } from '@/utils/statusColors';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import PeopleIcon from '@mui/icons-material/People';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import Select from '@mui/material/Select';

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; leadId: string | null; confirmedAmount: number | undefined }>({
    open: false,
    leadId: null,
    confirmedAmount: undefined,
  });

  const loadLeads = () => {
    setLoading(true);
    leadsApi
      .list({ page, limit: 10, search: debouncedSearch || undefined, status: status || undefined })
      .then((res) => {
        setLeads(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeads();
  }, [page, debouncedSearch, status]);

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

  const handleCancel = async (leadId: string) => {
    if (!confirm('Cancel this lead? Schedule will remain for audit; assignment will be marked inactive.')) return;
    setCancellingId(leadId);
    try {
      await leadsApi.cancel(leadId);
      loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus, currentStatus: LeadStatus) => {
    if (newStatus === currentStatus) return;
    
    // If changing to 'confirm', open dialog to get confirmed amount
    if (newStatus === 'confirm') {
      const lead = leads.find((l) => l._id === leadId);
      setConfirmDialog({
        open: true,
        leadId,
        confirmedAmount: lead?.confirmedAmount,
      });
      return;
    }
    
    // For other status changes, update directly
    setUpdatingStatusId(leadId);
    try {
      await leadsApi.update(leadId, { status: newStatus });
      loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmWithAmount = async () => {
    if (!confirmDialog.leadId) return;
    if (!confirmDialog.confirmedAmount || confirmDialog.confirmedAmount <= 0) {
      setError('Please enter a valid confirmed amount');
      return;
    }
    
    setUpdatingStatusId(confirmDialog.leadId);
    try {
      await leadsApi.update(confirmDialog.leadId, {
        status: 'confirm',
        confirmedAmount: confirmDialog.confirmedAmount,
      });
      setConfirmDialog({ open: false, leadId: null, confirmedAmount: undefined });
      loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm lead');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Leads"
        // subtitle="Cleaning jobs and client information"
        icon={<PeopleIcon sx={{ fontSize: 32 }} />}
        action={
          <Link to="/admin/leads/new" style={{ textDecoration: 'none' }}>
            <Button>
              + New Lead
            </Button>
          </Link>
        }
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
            placeholder="Search by company, contact, email, city, country, pass-code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />,
            }}
            sx={{ flex: { sm: '1 1 300px' }, minWidth: { xs: '100%', sm: 300 } }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 180, flexShrink: 0 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="created">Created</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="confirm">Confirm</MenuItem>
            <MenuItem value="follow_up">Follow Up</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
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
        ) : leads.length === 0 ? (
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
                No leads found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first lead to get started
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Link to="/admin/leads/new" style={{ textDecoration: 'none' }}>
                  <Button variant="primary">
                    + New Lead
                  </Button>
                </Link>
              </Box>
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
                      <TableCell>Location</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Quoted Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                  </TableHead>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow
                          key={lead._id}
                          sx={{
                            transition: 'background-color 0.2s',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{lead.client.companyName}</TableCell>
                          <TableCell>{lead.client.contactPerson}</TableCell>
                          <TableCell>{lead.location.city}, {lead.location.pincode}</TableCell>
                          <TableCell>{lead.cleaningDetails.cleaningType}</TableCell>
                          <TableCell>
                            {lead.quotedAmount !== undefined && lead.quotedAmount !== null
                              ? `$${lead.quotedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {lead.status === 'completed' || lead.status === 'cancelled' ? (
                              <Typography sx={{ color: getStatusColor(lead.status), fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                                {lead.status.replace('_', ' ')}
                              </Typography>
                            ) : (
                              <Select
                                value={lead.status}
                                onChange={(e) => handleStatusChange(lead._id, e.target.value as LeadStatus, lead.status)}
                                disabled={updatingStatusId === lead._id}
                                size="small"
                                sx={{
                                  minWidth: 100,
                                  fontSize: '0.875rem',
                                  color: getStatusColor(lead.status),
                                  fontWeight: 500,
                                  '& .MuiOutlinedInput-notchedOutline': {
                                  
                                    border: 'none',
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    
                                    border: 'none',
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                   
                                    border: 'none',
                                  },
                                  '& .MuiSelect-select': {
                                    py: 0.5,
                                    pl:0,
                                    textTransform: 'capitalize',
                                  },
                                }}
                              >
                                <MenuItem value="created">Created</MenuItem>
                                <MenuItem value="confirm">Confirm</MenuItem>
                                <MenuItem value="follow_up">Follow Up</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>{lead.slaPriority}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              {lead.status !== 'completed' && (
                                <Tooltip title="Edit Lead" arrow>
                                  <IconButton
                                    component={Link}
                                    to={`/admin/leads/${lead._id}/edit`}
                                    size="small"
                                    color="primary"
                                    sx={{ '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {lead.status !== 'cancelled' && lead.status !== 'completed' && (
                                <Tooltip title={cancellingId === lead._id ? 'Cancelling…' : 'Cancel Lead'} arrow>
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={cancellingId === lead._id}
                                      onClick={() => handleCancel(lead._id)}
                                      sx={{ 
                                        color: '#ef4444',
                                        '&:hover': { bgcolor: '#ef4444', color: 'white' },
                                        '&:disabled': { color: '#ef4444', opacity: 0.5 }
                                      }}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              {lead.status === 'completed' && (
                                <Typography variant="body2" color="text.secondary">Completed</Typography>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </CompactTable>
              </Box>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Stack spacing={2}>
                  {leads.map((lead) => (
                    <Paper
                      key={lead._id}
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
                            {lead.client.companyName}
                          </Typography>
                          {lead.status === 'completed' || lead.status === 'cancelled' ? (
                            <Chip label={lead.status} size="small" {...getStatusChipProps(lead.status)} />
                          ) : (
                            <Select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead._id, e.target.value as LeadStatus, lead.status)}
                              disabled={updatingStatusId === lead._id}
                              size="small"
                              sx={{
                                minWidth: 120,
                                fontSize: '0.75rem',
                                '& .MuiSelect-select': {
                                  py: 0.5,
                                  textTransform: 'capitalize',
                                },
                              }}
                            >
                              <MenuItem value="created">Created</MenuItem>
                              <MenuItem value="confirm">Confirm</MenuItem>
                              <MenuItem value="follow_up">Follow Up</MenuItem>
                              <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                          )}
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Contact
                          </Typography>
                          <Typography variant="body2">{lead.client.contactPerson}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Location
                          </Typography>
                          <Typography variant="body2">
                            {lead.location.city}, {lead.location.pincode}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Type
                          </Typography>
                          <Typography variant="body2">{lead.cleaningDetails.cleaningType}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Quoted Amount
                          </Typography>
                          <Typography variant="body2">
                            {lead.quotedAmount !== undefined && lead.quotedAmount !== null
                              ? `$${lead.quotedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Priority
                          </Typography>
                          <Typography variant="body2">{lead.slaPriority}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          {lead.status !== 'completed' && (
                            <Tooltip title="Edit Lead" arrow>
                              <IconButton
                                component={Link}
                                to={`/admin/leads/${lead._id}/edit`}
                                size="medium"
                                color="primary"
                                sx={{ flex: 1, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {lead.status !== 'cancelled' && lead.status !== 'completed' && (
                            <Tooltip title={cancellingId === lead._id ? 'Cancelling…' : 'Cancel Lead'} arrow>
                              <span style={{ flex: 1, display: 'flex' }}>
                                <IconButton
                                  size="medium"
                                  onClick={() => handleCancel(lead._id)}
                                  disabled={cancellingId === lead._id}
                                  sx={{ 
                                    width: '100%', 
                                    border: '1px solid', 
                                    borderColor: '#ef4444', 
                                    borderRadius: 1, 
                                    color: '#ef4444',
                                    '&:hover': { bgcolor: '#ef4444', color: 'white' },
                                    '&:disabled': { color: '#ef4444', opacity: 0.5, borderColor: '#ef4444' }
                                  }}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </>
          )}
          {total > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, mb: 1 }}>
              <Pagination
                count={Math.ceil(total / 10)}
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

      {/* Confirm Amount Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => !updatingStatusId && setConfirmDialog({ open: false, leadId: null, confirmedAmount: undefined })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Lead</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Please enter the confirmed amount for this lead.
            </Typography>
            <TextField
              fullWidth
              label="Confirmed Amount"
              type="number"
              value={confirmDialog.confirmedAmount ?? ''}
              onChange={(e) =>
                setConfirmDialog((prev) => ({
                  ...prev,
                  confirmedAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                }))
              }
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Final confirmed amount after agreement"
              required
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setConfirmDialog({ open: false, leadId: null, confirmedAmount: undefined })}
            disabled={updatingStatusId !== null}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmWithAmount}
            disabled={updatingStatusId !== null || !confirmDialog.confirmedAmount || confirmDialog.confirmedAmount <= 0}
          >
            {updatingStatusId !== null ? 'Confirming...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
