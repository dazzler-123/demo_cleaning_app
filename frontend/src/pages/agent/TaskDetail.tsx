import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assignmentsApi, taskLogsApi } from '@/api/endpoints';
import type { Assignment, TaskLog } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { getStatusColor, getStatusChipProps } from '@/utils/statusColors';
import { getImageUrl, getImageUrlFallback } from '@/utils/imageUrl';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotesIcon from '@mui/icons-material/Notes';
import HistoryIcon from '@mui/icons-material/History';
import UpdateIcon from '@mui/icons-material/Update';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Skeleton from '@mui/material/Skeleton';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

const VALID_NEXT_STATUS: Record<string, string[]> = {
  pending: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      assignmentsApi.get(id),
      taskLogsApi.getByAssignment(id),
    ])
      .then(([aRes, lRes]) => {
        setAssignment(aRes.data);
        setLogs(lRes.data);
        setNewStatus(aRes.data.status);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    setSelectedImages((prev) => [...prev, ...validFiles]);
    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStatus = async () => {
    if (!id || newStatus === assignment?.status) return;
    if (newStatus === 'completed' && selectedImages.length === 0) {
      setError('Please upload at least one completion image');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      await assignmentsApi.updateStatus(id, { status: newStatus }, newStatus === 'completed' ? selectedImages : undefined);
      const [aRes, lRes] = await Promise.all([
        assignmentsApi.get(id),
        taskLogsApi.getByAssignment(id),
      ]);
      setAssignment(aRes.data);
      setLogs(lRes.data);
      setSelectedImages([]);
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImagePreviews([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !assignment) {
    return (
      <Box>
        <PageHeader title="Task Details" subtitle={loading ? 'Loading task details...' : 'Task not found'} />
        {loading ? (
          <Card>
            <Box sx={{ p: 2 }}>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" height={24} sx={{ mt: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2, borderRadius: 1 }} />
            </Box>
          </Card>
        ) : (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            Task not found
          </Alert>
        )}
      </Box>
    );
  }

  const lead = assignment.leadId && typeof assignment.leadId === 'object' ? assignment.leadId : null;
  const schedule = assignment.scheduleId && typeof assignment.scheduleId === 'object' ? assignment.scheduleId : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ fontSize: 18 }} />;
      case 'in_progress':
        return <UpdateIcon sx={{ fontSize: 18 }} />;
      default:
        return <ScheduleIcon sx={{ fontSize: 18 }} />;
    }
  };

  return (
    <Box>
      <PageHeader
        title={lead?.client?.companyName ?? 'Task details'}
        subtitle={`Current status: ${assignment.status.replace('_', ' ')}`}
        action={
          <Button
            variant="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/agent/tasks')}
            sx={{ textTransform: 'none' }}
          >
            Back to tasks
          </Button>
        }
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          View task details and update job status
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Status Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: `linear-gradient(135deg, ${getStatusChipProps(assignment.status).sx?.bgcolor || '#051747'}15 0%, ${getStatusChipProps(assignment.status).sx?.bgcolor || '#051747'}08 100%)`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                background: `linear-gradient(135deg, ${getStatusChipProps(assignment.status).sx?.bgcolor || '#051747'} 0%, ${getStatusChipProps(assignment.status).sx?.bgcolor || '#051747'}dd 100%)`,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${getStatusChipProps(assignment.status).sx?.bgcolor || '#051747'}40`,
              }}
            >
              {getStatusIcon(assignment.status)}
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Current Status
              </Typography>
              <Typography variant={isMobile ? 'body1' : 'h6'} fontWeight={700} sx={{ color: getStatusChipProps(assignment.status).sx?.bgcolor || '#051747' }}>
                {assignment.status.replace('_', ' ').toUpperCase()}
              </Typography>
            </Box>
          </Stack>
          {schedule && (
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, width: { xs: '100%', sm: 'auto' } }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Scheduled Date
              </Typography>
              <Typography variant={isMobile ? 'body2' : 'body1'} fontWeight={600}>
                {new Date(schedule.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Client & Location */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.3s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(5, 23, 71, 0.1)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BusinessIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
                Client & Location
              </Typography>
            </Box>
            {lead && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                    Company Name
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                    {lead.client.companyName}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                    Contact Person
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body1">{lead.client.contactPerson}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body1" component="a" href={`tel:${lead.client.phone}`} sx={{ textDecoration: 'none', color: 'primary.main' }}>
                      {lead.client.phone}
                    </Typography>
                  </Stack>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                    Address
                  </Typography>
                  <Stack direction="row" alignItems="flex-start" gap={1} sx={{ mt: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                    <Typography variant="body1">
                      {lead.location.address}, {lead.location.city}, {lead.location.state} {lead.location.pincode}
                    </Typography>
                  </Stack>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                    Cleaning Details
                  </Typography>
                  <Stack direction="row" gap={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={lead.cleaningDetails.cleaningType}
                      size="small"
                      sx={{
                        bgcolor: 'primary.main',
                        color: '#FFFFFF',
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      label={lead.cleaningDetails.category}
                      size="small"
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                      }}
                    />
                  </Stack>
                </Box>
                {lead.confirmedAmount !== undefined && lead.confirmedAmount !== null && (
                  <>
                    <Divider />
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                        border: '1px solid',
                        borderColor: 'primary.light',
                        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)',
                      }}
                    >
                      <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, letterSpacing: 0.8, fontSize: '0.75rem' }}>
                        Service Charge
                      </Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, color: 'primary.main' }}>
                        ${lead.confirmedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Schedule */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              transition: 'all 0.3s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(5, 23, 71, 0.1)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScheduleIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
                Schedule
              </Typography>
            </Box>
            {schedule && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                    Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                    {new Date(schedule.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                    Time Slot
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body1" fontWeight={600}>
                      {schedule.timeSlot}
                    </Typography>
                  </Stack>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                    Duration
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                    {schedule.duration} minutes
                  </Typography>
                </Box>
                {schedule.notes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
                        Notes
                      </Typography>
                      <Stack direction="row" alignItems="flex-start" gap={1} sx={{ mt: 0.5 }}>
                        <NotesIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                        <Typography variant="body1">{schedule.notes}</Typography>
                      </Stack>
                    </Box>
                  </>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Status Update */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: assignment.status === 'completed' 
            ? 'linear-gradient(135deg, #f1f8e9 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <UpdateIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
          <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
            Update Status
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Allowed transitions: <strong>Pending</strong> → <strong>In Progress</strong> → <strong>Completed</strong>. Completed tasks cannot be edited.
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
            <TextField
              select
              size="small"
              label="New Status"
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value);
                if (e.target.value !== 'completed') {
                  setSelectedImages([]);
                  imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                  setImagePreviews([]);
                }
              }}
              fullWidth={isMobile}
              sx={{ minWidth: { sm: 180 } }}
              disabled={assignment.status === 'completed' || updating}
            >
              <MenuItem value={assignment.status}>
                {assignment.status.replace('_', ' ')} (Current)
              </MenuItem>
              {(VALID_NEXT_STATUS[assignment.status] ?? []).map((s) => (
                <MenuItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="primary"
              onClick={handleUpdateStatus}
              disabled={updating || newStatus === assignment.status || assignment.status === 'completed'}
              startIcon={updating ? <CircularProgress size={16} /> : <UpdateIcon />}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600, 
                width: { xs: '100%', sm: 'auto' },
                borderRadius: 2,
                px: 4,
                py: 1,
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                },
                '&:disabled': {
                  background: 'rgba(0, 0, 0, 0.12)',
                },
              }}
            >
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </Stack>
          {newStatus === 'completed' && assignment.status !== 'completed' && (
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Completion Images <span style={{ color: 'red' }}>*</span>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Upload at least one image showing the completed work. Multiple images allowed (max 500KB per image).
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                multiple
                onChange={handleImageSelect}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="secondary"
                  component="span"
                  startIcon={<ImageIcon />}
                  sx={{ mb: 2 }}
                >
                  Select Images
                </Button>
              </label>
              {imagePreviews.length > 0 && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {imagePreviews.map((preview, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
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
                          alt={`Preview ${index + 1}`}
                          sx={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveImage(index)}
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
            </Box>
          )}
          {assignment.completionImages && assignment.completionImages.length > 0 && (
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Completion Images
              </Typography>
              <Grid container spacing={2}>
                {assignment.completionImages.map((img, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Box
                      component="img"
                      src={getImageUrl(img)}
                      alt={`Completion ${index + 1}`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const fallbackUrl = getImageUrlFallback(img);
                        if (target.src !== fallbackUrl) {
                          target.src = fallbackUrl;
                        }
                      }}
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Job History */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HistoryIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
          <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
            Job History
          </Typography>
        </Box>
        {logs.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              gap: 1,
            }}
          >
            <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
            <Typography color="text.secondary" variant="body2">
              No job history yet
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {logs.map((log, index) => (
              <Paper
                key={log._id}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} flexWrap="wrap">
                  <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                    <Chip
                      label={log.fromStatus.replace('_', ' ')}
                      size="small"
                      {...getStatusChipProps(log.fromStatus)}
                    />
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      →
                    </Typography>
                    <Chip
                      label={log.toStatus.replace('_', ' ')}
                      size="small"
                      {...getStatusChipProps(log.toStatus)}
                    />
                  </Stack>
                  <Box sx={{ ml: { xs: 0, sm: 'auto' }, textAlign: { xs: 'left', sm: 'right' }, width: { xs: '100%', sm: 'auto' } }}>
                    {log.changedBy && typeof log.changedBy === 'object' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        by {log.changedBy.name}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
