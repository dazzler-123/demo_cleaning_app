import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assignmentsApi } from '@/api/endpoints';
import type { Assignment, TaskStatus } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { getStatusChipProps } from '@/utils/statusColors';
import { getImageUrl, getImageUrlFallback } from '@/utils/imageUrl';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Skeleton from '@mui/material/Skeleton';
import FilterListIcon from '@mui/icons-material/FilterList';
import UpdateIcon from '@mui/icons-material/Update';
import CancelIcon from '@mui/icons-material/Cancel';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';

const VALID_NEXT_STATUS: Record<string, TaskStatus[]> = {
  pending: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
};

export default function MyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; task: Assignment | null; newStatus: TaskStatus }>({
    open: false,
    task: null,
    newStatus: 'pending',
  });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; task: Assignment | null }>({
    open: false,
    task: null,
  });
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [beforePreviews, setBeforePreviews] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [afterPreviews, setAfterPreviews] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    assignmentsApi
      .getMyTasks({ status: statusFilter || undefined })
      .then((res) => setTasks(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const companyName = (a: Assignment) =>
    a.leadId && typeof a.leadId === 'object' && a.leadId.client
      ? a.leadId.client.companyName
      : '—';

  const scheduleInfo = (a: Assignment) => {
    if (!a.scheduleId || typeof a.scheduleId !== 'object') return '—';
    const d = a.scheduleId.date;
    const slot = a.scheduleId.timeSlot;
    return `${new Date(d).toLocaleDateString()} · ${slot} (${a.scheduleId.duration} min)`;
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const company = companyName(task).toLowerCase();
    const location = task.leadId && typeof task.leadId === 'object' && task.leadId.location
      ? `${task.leadId.location.address} ${task.leadId.location.city}`.toLowerCase()
      : '';
    return company.includes(query) || location.includes(query);
  });

  const getTaskPriority = (task: Assignment) => {
    if (!task.scheduleId || typeof task.scheduleId !== 'object') return 'normal';
    const taskDate = new Date(task.scheduleId.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 2) return 'urgent';
    return 'normal';
  };

  const handleOpenUpdate = (task: Assignment) => {
    setUpdateDialog({
      open: true,
      task,
      newStatus: task.status as TaskStatus,
    });
    setError('');
    setBeforeImages([]);
    beforePreviews.forEach((url) => URL.revokeObjectURL(url));
    setBeforePreviews([]);
    setAfterImages([]);
    afterPreviews.forEach((url) => URL.revokeObjectURL(url));
    setAfterPreviews([]);
  };

  const handleImageSelect = (type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const MAX_SIZE = 500 * 1024; // 500KB in bytes
    const validFiles = files.filter((f) => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_SIZE) return false;
      return true;
    });
    
    const oversizedFiles = files.filter((f) => f.size > MAX_SIZE);
    const nonImageFiles = files.filter((f) => !f.type.startsWith('image/'));
    
    if (nonImageFiles.length > 0) {
      setError('Only image files are allowed');
      return;
    }
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(', ');
      setError(`The following image(s) exceed 500KB limit: ${fileNames}. Please select smaller images.`);
      return;
    }
    
    if (validFiles.length === 0) return;
    
    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    if (type === 'before') {
      setBeforeImages((prev) => [...prev, ...validFiles]);
      setBeforePreviews((prev) => [...prev, ...newPreviews]);
    } else {
      setAfterImages((prev) => [...prev, ...validFiles]);
      setAfterPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveImage = (type: 'before' | 'after', index: number) => {
    if (type === 'before') {
      setBeforeImages((prev) => prev.filter((_, i) => i !== index));
      URL.revokeObjectURL(beforePreviews[index]);
      setBeforePreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAfterImages((prev) => prev.filter((_, i) => i !== index));
      URL.revokeObjectURL(afterPreviews[index]);
      setAfterPreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpdateStatus = async () => {
    if (!updateDialog.task || updateDialog.newStatus === updateDialog.task.status) return;
    if (updateDialog.newStatus === 'completed' && (beforeImages.length === 0 || afterImages.length === 0)) {
      setError('Please upload at least one before image and one after image');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      await assignmentsApi.updateStatus(
        updateDialog.task._id,
        { status: updateDialog.newStatus },
        updateDialog.newStatus === 'completed' ? [...beforeImages, ...afterImages] : undefined
      );
      setUpdateDialog({ open: false, task: null, newStatus: 'pending' });
      setBeforeImages([]);
      beforePreviews.forEach((url) => URL.revokeObjectURL(url));
      setBeforePreviews([]);
      setAfterImages([]);
      afterPreviews.forEach((url) => URL.revokeObjectURL(url));
      setAfterPreviews([]);
      const res = await assignmentsApi.getMyTasks({ status: statusFilter || undefined });
      setTasks(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenCancel = (task: Assignment) => {
    setCancelDialog({ open: true, task });
    setError('');
  };

  const handleCancelTask = async () => {
    if (!cancelDialog.task) return;
    setCancelling(true);
    setError('');
    try {
      await assignmentsApi.updateStatus(cancelDialog.task._id, { status: 'cancelled', reason: 'Cancelled by agent' });
      setCancelDialog({ open: false, task: null });
      const res = await assignmentsApi.getMyTasks({ status: statusFilter || undefined });
      setTasks(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="My Tasks"
        subtitle={`${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'} assigned`}
        icon={<AssignmentIcon sx={{ fontSize: 32 }} />}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Manage your assigned cleaning jobs and update their status
        </Typography>
      </Box>

      {/* Filters and Search */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          mb: 3,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)',
          border: '1px solid',
          borderColor: 'rgba(16, 185, 129, 0.2)',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
          backdropFilter: 'blur(10px)',
        }}
      >
        <TextField
          size="small"
          placeholder="Search by company or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: '#10b981' }} />
              </InputAdornment>
            ),
          }}
          fullWidth
          sx={{
            flex: { xs: 'none', sm: 1 },
            minWidth: { sm: 250 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover fieldset': {
                borderColor: '#10b981',
              },
              '&.Mui-focused': {
                backgroundColor: 'white',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)',
              },
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <FilterListIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: '#10b981', display: { xs: 'none', sm: 'block' } }} />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            fullWidth
            sx={{
              minWidth: { sm: 160 },
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                '&:hover fieldset': {
                  borderColor: '#10b981',
                },
                '&.Mui-focused': {
                  backgroundColor: 'white',
                  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)',
                },
              },
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </TextField>
        </Box>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2, borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={36} sx={{ mt: 2, borderRadius: 1 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {filteredTasks.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                borderRadius: '20px',
                border: '2px dashed',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.5) 0%, rgba(236, 254, 245, 0.5) 100%)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                }}
              >
                <InboxIcon sx={{ fontSize: 50, color: 'white' }} />
              </Box>
              <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
                {searchQuery || statusFilter ? 'No tasks match your filters' : 'No tasks assigned'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, fontSize: '1rem' }}>
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filter criteria'
                  : "You'll see your assigned tasks here when they're available"}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredTasks.map((task) => {
                const priority = getTaskPriority(task);
                const lead = task.leadId && typeof task.leadId === 'object' ? task.leadId : null;
                const schedule = task.scheduleId && typeof task.scheduleId === 'object' ? task.scheduleId : null;
                
                const priorityConfig = {
                  overdue: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', label: 'Overdue', color: '#ef4444', icon: '🚨' },
                  urgent: { bg: 'rgba(234, 179, 8, 0.08)', border: 'rgba(234, 179, 8, 0.3)', label: 'Urgent', color: '#eab308', icon: '⚡' },
                  today: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', label: 'Today', color: '#3b82f6', icon: '📅' },
                  normal: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', label: 'Normal', color: '#10b981', icon: '✓' },
                };
                const config = priorityConfig[priority];
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={task._id}>
                    <Paper
                      elevation={0}
                      onClick={() => navigate(`/agent/tasks/${task._id}`)}
                      sx={{
                        p: 0,
                        borderRadius: '16px',
                        background: config.bg,
                        backdropFilter: 'blur(10px)',
                        border: '1.5px solid',
                        borderColor: config.border,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: `0 8px 24px rgba(16, 185, 129, 0.12)`,
                        '&:hover': {
                          boxShadow: `0 20px 40px ${config.color}40`,
                          transform: 'translateY(-8px) scale(1.02)',
                          borderColor: config.color,
                          background: `linear-gradient(135deg, ${config.bg} 0%, rgba(255, 255, 255, 0.5) 100%)`,
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '4px',
                          background: `linear-gradient(90deg, ${config.color} 0%, ${config.color}66 100%)`,
                        },
                      }}
                    >
                      {/* Priority Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: '8px',
                          bgcolor: config.color,
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: `0 4px 12px ${config.color}40`,
                          zIndex: 10,
                        }}
                      >
                        {config.icon} {config.label}
                      </Box>

                      {/* Content */}
                      <Stack spacing={2} sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {/* Company Header */}
                        <Stack direction="row" alignItems="center" gap={2}>
                          <Box
                            sx={{
                              p: 1.25,
                              borderRadius: '12px',
                              background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 4px 12px ${config.color}40`,
                            }}
                          >
                            <BusinessIcon sx={{ fontSize: 22 }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {companyName(task)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {task.status?.replace('_', ' ')}
                            </Typography>
                          </Box>
                        </Stack>

                        {/* Location and Time */}
                        <Stack spacing={1.5} sx={{ flex: 1 }}>
                          {lead?.location && (
                            <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ minWidth: 0 }}>
                              <LocationOnIcon sx={{ fontSize: 18, color: config.color, mt: 0.3, flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lead.location.address}, {lead.location.city}
                              </Typography>
                            </Stack>
                          )}
                          {schedule && (
                            <Stack direction="row" alignItems="center" gap={1.5}>
                              <ScheduleIcon sx={{ fontSize: 18, color: config.color, flexShrink: 0 }} />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {new Date(schedule.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {schedule.timeSlot} · {schedule.duration} min
                                </Typography>
                              </Box>
                            </Stack>
                          )}
                        </Stack>

                        {/* Service Charge Card */}
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%)`,
                            backdropFilter: 'blur(10px)',
                            border: '1px solid',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                            Service Charge
                          </Typography>
                          <Typography variant="h5" fontWeight={800} sx={{ color: config.color, mt: 0.5 }}>
                            ${typeof task.amount === 'number' ? task.amount.toFixed(2) : '0.00'}
                          </Typography>
                        </Box>

                        {/* Action Buttons */}
                        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenUpdate(task);
                            }}
                            startIcon={<UpdateIcon />}
                            sx={{
                              flex: 1,
                              borderRadius: '10px',
                              background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
                              boxShadow: `0 4px 12px ${config.color}40`,
                              textTransform: 'none',
                              fontWeight: 700,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                boxShadow: `0 8px 20px ${config.color}60`,
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            Update
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCancel(task);
                            }}
                            startIcon={<CancelIcon />}
                            sx={{
                              flex: 1,
                              borderRadius: '10px',
                              borderColor: config.color,
                              color: config.color,
                              textTransform: 'none',
                              fontWeight: 700,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                borderColor: config.color,
                                backgroundColor: `${config.color}15`,
                              },
                            }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* Update Status Dialog */}
      <Dialog 
        open={updateDialog.open} 
        onClose={() => !updating && setUpdateDialog({ open: false, task: null, newStatus: 'pending' })} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          fontWeight: 600,
        }}>
          Update Task Status
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {updateDialog.task && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                mb: 2,
                p: 1.5,
                bgcolor: 'primary.light',
                borderRadius: 2,
              }}>
                <BusinessIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600} color="primary.dark">
                  {companyName(updateDialog.task)}
                </Typography>
              </Box>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
              <TextField
                select
                fullWidth
                label="New Status"
                value={updateDialog.newStatus}
                onChange={(e) => {
                  setUpdateDialog((d) => ({ ...d, newStatus: e.target.value as TaskStatus }));
                  if (e.target.value !== 'completed') {
                    setBeforeImages([]);
                    beforePreviews.forEach((url) => URL.revokeObjectURL(url));
                    setBeforePreviews([]);
                    setAfterImages([]);
                    afterPreviews.forEach((url) => URL.revokeObjectURL(url));
                    setAfterPreviews([]);
                  }
                }}
                sx={{ mt: 2 }}
              >
                <MenuItem value={updateDialog.task.status}>
                  {updateDialog.task.status.replace('_', ' ')} (Current)
                </MenuItem>
                {(VALID_NEXT_STATUS[updateDialog.task.status] ?? []).map((s) => (
                  <MenuItem key={s} value={s}>
                    {s.replace('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
              {updateDialog.newStatus === 'completed' && updateDialog.task.status !== 'completed' && (
                <Box sx={{ mt: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(25, 118, 210, 0.04)',
                      border: '1px solid',
                      borderColor: 'primary.light',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: 'primary.dark' }}>
                      Before Images <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      Upload at least one image before cleaning. Multiple images allowed (max 500KB per image).
                    </Typography>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="before-image-upload-dialog"
                      type="file"
                      multiple
                      onChange={(e) => handleImageSelect('before', e)}
                    />
                    <label htmlFor="before-image-upload-dialog">
                      <Button 
                        variant="outlined" 
                        component="span" 
                        startIcon={<ImageIcon />} 
                        sx={{ 
                          mb: 2,
                          borderRadius: 2,
                          borderWidth: 2,
                          fontWeight: 600,
                          '&:hover': {
                            borderWidth: 2,
                            bgcolor: 'primary.light',
                          },
                        }}
                      >
                        Select Before Images
                      </Button>
                    </label>
                    {beforePreviews.length > 0 && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {beforePreviews.map((preview, index) => (
                        <Grid item xs={6} sm={4} key={`before-${index}`}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              position: 'relative',
                            }}
                          >
                            <Box
                              component="img"
                              src={preview}
                              alt={`Before ${index + 1}`}
                              sx={{
                                width: '100%',
                                height: 100,
                                objectFit: 'cover',
                                borderRadius: 1,
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveImage('before', index)}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    )}
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(76, 175, 80, 0.04)',
                      border: '1px solid',
                      borderColor: 'success.light',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: 'success.dark' }}>
                      After Images <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      Upload at least one image after cleaning. Multiple images allowed (max 500KB per image).
                    </Typography>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="after-image-upload-dialog"
                      type="file"
                      multiple
                      onChange={(e) => handleImageSelect('after', e)}
                    />
                    <label htmlFor="after-image-upload-dialog">
                      <Button 
                        variant="outlined" 
                        component="span" 
                        startIcon={<ImageIcon />} 
                        sx={{ 
                          mb: 2,
                          borderRadius: 2,
                          borderWidth: 2,
                          borderColor: 'success.main',
                          color: 'success.dark',
                          fontWeight: 600,
                          '&:hover': {
                            borderWidth: 2,
                            bgcolor: 'success.light',
                          },
                        }}
                      >
                        Select After Images
                      </Button>
                    </label>
                  {afterPreviews.length > 0 && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {afterPreviews.map((preview, index) => (
                        <Grid item xs={6} sm={4} key={`after-${index}`}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              position: 'relative',
                            }}
                          >
                            <Box
                              component="img"
                              src={preview}
                              alt={`After ${index + 1}`}
                              sx={{
                                width: '100%',
                                height: 100,
                                objectFit: 'cover',
                                borderRadius: 1,
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveImage('after', index)}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    )}
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => setUpdateDialog({ open: false, task: null, newStatus: 'pending' })} 
            disabled={updating}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateStatus}
            disabled={updating || updateDialog.newStatus === updateDialog.task?.status}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
              },
              '&:disabled': {
                background: 'rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            {updating ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Task Dialog */}
      <Dialog open={cancelDialog.open} onClose={() => !cancelling && setCancelDialog({ open: false, task: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Task</DialogTitle>
        <DialogContent>
          {cancelDialog.task && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Are you sure you want to cancel this task? This action cannot be undone.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                <strong>Company:</strong> {companyName(cancelDialog.task)}
              </Typography>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCancelDialog({ open: false, task: null })} disabled={cancelling}>
            No, Keep Task
          </Button>
          <Button variant="contained" color="error" onClick={handleCancelTask} disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
