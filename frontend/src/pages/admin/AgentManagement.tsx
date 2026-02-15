import { useEffect, useState } from 'react';
import { agentsApi } from '@/api/endpoints';
import type { Agent } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Box from '@mui/material/Box';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CompactTable from '@/components/CompactTable';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import PersonIcon from '@mui/icons-material/Person';
import InboxIcon from '@mui/icons-material/Inbox';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EditIcon from '@mui/icons-material/Edit';
import ScheduleIcon from '@mui/icons-material/Schedule';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { dashboardApi, assignmentsApi } from '@/api/endpoints';
import type { AgentReport, AgentTask } from '@/api/endpoints';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { STATUS_COLORS, getStatusColor } from '@/utils/statusColors';

// Helper function to parse skills (handles both string and array formats)
const parseSkills = (skills: string | string[] | undefined): string[] => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') {
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [usersLoadError, setUsersLoadError] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [createUserId, setCreateUserId] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createSkills, setCreateSkills] = useState('');
  const [createDailyCapacity, setCreateDailyCapacity] = useState<number>(5);
  const [createExperience, setCreateExperience] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [availabilityDialog, setAvailabilityDialog] = useState<{ open: boolean; agent: Agent | null; value: string }>({
    open: false,
    agent: null,
    value: 'available',
  });
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  const [editDialog, setEditDialog] = useState<{ open: boolean; agent: Agent | null }>({
    open: false,
    agent: null,
  });
  const [editPhone, setEditPhone] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editDailyCapacity, setEditDailyCapacity] = useState<number>(5);
  const [editExperience, setEditExperience] = useState('');
  const [editAvailability, setEditAvailability] = useState<'available' | 'busy' | 'off_duty'>('available');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [reportDialog, setReportDialog] = useState<{ open: boolean; agent: Agent | null }>({
    open: false,
    agent: null,
  });
  const [reportData, setReportData] = useState<AgentReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksLimit] = useState(10);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');

  const loadAgents = () => {
    setLoading(true);
    agentsApi
      .list({ page, limit: 10 })
      .then((res) => {
        setAgents(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAgents();
  }, [page]);

  const handleOpenCreate = () => {
    setCreateUserId('');
    setCreatePhone('');
    setCreateSkills('');
    setCreateDailyCapacity(5);
    setCreateExperience('');
    setCreateError('');
    setUsersLoadError('');
    setAvailableUsers([]);
    setCreateOpen(true);
    setUsersLoading(true);
    agentsApi
      .getAvailableUsers()
      .then((res) => {
        setUsersLoadError('');
        const data = res?.data;
        const list = Array.isArray(data) ? data : [];
        setAvailableUsers(list);
      })
      .catch((err) => {
        setAvailableUsers([]);
        setUsersLoadError(err instanceof Error ? err.message : 'Could not load users. Check your permission.');
      })
      .finally(() => setUsersLoading(false));
  };

  const dropdownUserIds = new Set(availableUsers.map((u) => u._id));
  const selectValue = createUserId && dropdownUserIds.has(createUserId) ? createUserId : '';

  useEffect(() => {
    if (!createOpen) return;
    if (createUserId && !dropdownUserIds.has(createUserId)) setCreateUserId('');
  }, [createOpen, createUserId, availableUsers]);

  const handleCreate = async () => {
    if (!createUserId) {
      setCreateError('Please select a user with role Agent.');
      return;
    }
    setCreateError('');
    setCreateLoading(true);
    try {
      const skills = createSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await agentsApi.create({
        userId: selectValue,
        phone: createPhone.trim() || undefined,
        skills: skills.length ? skills : undefined,
        dailyCapacity: createDailyCapacity,
        experience: createExperience.trim() || undefined,
      });
      setCreateOpen(false);
      loadAgents();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create agent profile');
    } finally {
      setCreateLoading(false);
    }
  };

  const userName = (a: Agent) => a.userId && typeof a.userId === 'object' ? a.userId.name : '—';
  const userEmail = (a: Agent) => a.userId && typeof a.userId === 'object' ? a.userId.email : '—';

  const openAvailabilityDialog = (agent: Agent) => {
    setAvailabilityDialog({
      open: true,
      agent,
      value: agent.availability ?? 'available',
    });
    setAvailabilityError('');
  };

  const openEditDialog = (agent: Agent) => {
    setEditDialog({ open: true, agent });
    setEditPhone(agent.phone ?? '');
    const skillsArray = parseSkills(agent.skills);
    setEditSkills(skillsArray.join(', ') ?? '');
    setEditDailyCapacity(agent.dailyCapacity ?? 5);
    setEditExperience(agent.experience ?? '');
    setEditAvailability((agent.availability as 'available' | 'busy' | 'off_duty') ?? 'available');
    setEditStatus((agent.status as 'active' | 'inactive') ?? 'active');
    setEditError('');
  };

  const handleUpdateAgent = async () => {
    if (!editDialog.agent) return;
    setEditError('');
    setEditLoading(true);
    try {
      const skills = editSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await agentsApi.update(editDialog.agent._id, {
        phone: editPhone.trim() || undefined,
        skills: skills.length ? skills : undefined,
        dailyCapacity: editDailyCapacity,
        experience: editExperience.trim() || undefined,
        availability: editAvailability,
        status: editStatus,
      });
      setEditDialog({ open: false, agent: null });
      loadAgents();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update agent');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateAvailability = async () => {
    if (!availabilityDialog.agent) return;
    setAvailabilityError('');
    setAvailabilitySaving(true);
    try {
      await agentsApi.update(availabilityDialog.agent._id, {
        availability: availabilityDialog.value as 'available' | 'busy' | 'off_duty',
      });
      setAvailabilityDialog({ open: false, agent: null, value: 'available' });
      loadAgents();
    } catch (err) {
      setAvailabilityError(err instanceof Error ? err.message : 'Failed to update availability');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const loadAgentTasks = async (agentId: string, page: number = 1) => {
    setTasksLoading(true);
    setTasksError('');
    try {
      const res = await assignmentsApi.getAgentTasks(agentId, { page, limit: tasksLimit });
      setAgentTasks(res.data.items);
      setTasksTotal(res.data.total);
      setTasksPage(page);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Failed to load tasks');
      setAgentTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleOpenReport = async (agent: Agent) => {
    setReportDialog({ open: true, agent });
    setReportData(null);
    setReportError('');
    setAgentTasks([]);
    setTasksPage(1);
    setTasksTotal(0);
    setReportLoading(true);
    try {
      const res = await dashboardApi.agentReport(agent._id, { days: 30 });
      setReportData(res.data);
      // Load tasks separately
      await loadAgentTasks(agent._id, 1);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const AVAILABILITY_OPTIONS: { value: 'available' | 'busy' | 'off_duty'; label: string }[] = [
    { value: 'available', label: 'Available' },
    { value: 'busy', label: 'Busy' },
    { value: 'off_duty', label: 'Off duty (leave / holiday)' },
  ];

  return (
    <Box>
      <PageHeader
        title="Agent Management"
        subtitle="Link users (role: agent) to agent profiles so they appear here and can get assignments"
        action={
          <Button onClick={handleOpenCreate}>Add agent profile</Button>
        }
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Manage agent profiles and their availability
        </Typography>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
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
          {agents.length === 0 ? (
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
                No agents found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create users with role &quot;agent&quot; and add agent profiles
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button onClick={handleOpenCreate} variant="primary">
                  Add agent profile
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              {/* Desktop Table View */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <CompactTable>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Skills</TableCell>
                      <TableCell>Availability</TableCell>
                      <TableCell>Daily capacity</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                      {agents.map((a) => (
                        <TableRow key={a._id}>
                          <TableCell>{userName(a)}</TableCell>
                          <TableCell>{userEmail(a)}</TableCell>
                          <TableCell>{a.phone ?? '—'}</TableCell>
                          <TableCell>{(() => {
                            const skillsArray = parseSkills(a.skills);
                            return skillsArray.length ? skillsArray.join(', ') : '—';
                          })()}</TableCell>
                          <TableCell>
                            <Typography sx={{ color: a.availability === 'available' ? '#22c55e' : a.availability === 'busy' ? '#eab308' : '#666666', fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                              {a.availability.replace('_', ' ')}
                            </Typography>
                          </TableCell>
                          <TableCell>{a.dailyCapacity}</TableCell>
                          <TableCell>
                            <Typography sx={{ color: a.status === 'active' ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                              {a.status}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View Report">
                                <IconButton size="small" onClick={() => handleOpenReport(a)} color="primary">
                                  <AssessmentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEditDialog(a)} color="primary">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Update Availability">
                                <IconButton size="small" onClick={() => openAvailabilityDialog(a)} color="primary">
                                  <ScheduleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
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
                  {agents.map((a) => (
                    <Paper
                      key={a._id}
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
                            {userName(a)}
                          </Typography>
                          <Chip
                            label={a.availability.replace('_', ' ')}
                            size="small"
                            sx={{
                              bgcolor: a.availability === 'available' ? '#22c55e' : a.availability === 'busy' ? '#eab308' : '#E7E9F0',
                              color: a.availability === 'off_duty' ? '#051747' : '#FFFFFF',
                              fontWeight: 500,
                            }}
                          />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body2">{userEmail(a)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography variant="body2">{a.phone ?? '—'}</Typography>
                        </Box>
                        {(() => {
                          const skillsArray = parseSkills(a.skills);
                          return skillsArray.length > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Skills
                              </Typography>
                              <Typography variant="body2">{skillsArray.join(', ')}</Typography>
                            </Box>
                          );
                        })()}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Daily Capacity
                            </Typography>
                            <Typography variant="body2">{a.dailyCapacity}</Typography>
                          </Box>
                          <Typography sx={{ color: a.status === 'active' ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                            {a.status}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="center">
                          <Tooltip title="View Report">
                            <IconButton size="small" onClick={() => handleOpenReport(a)} color="primary">
                              <AssessmentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEditDialog(a)} color="primary">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Update Availability">
                            <IconButton size="small" onClick={() => openAvailabilityDialog(a)} color="primary">
                              <ScheduleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
      )}
  
      <Dialog open={createOpen} onClose={() => !createLoading && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add agent profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a user who already has role &quot;Agent&quot; (created in Users). They will appear in the agent list and can receive assignments.
          </Typography>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            {usersLoadError && <Alert severity="error">{usersLoadError}</Alert>}
            <TextField
              select
              fullWidth
              label="User (role: Agent) *"
              value={selectValue}
              onChange={(e) => setCreateUserId(e.target.value)}
              disabled={usersLoading}
              error={false}
              SelectProps={{
                displayEmpty: true,
                renderValue: (v) => {
                  if (!v) return 'Select user…';
                  const u = availableUsers.find((x) => x._id === v);
                  return u ? `${u.name} — ${u.email}` : 'Select user…';
                },
              }}
              helperText={
                usersLoading
                  ? 'Loading users…'
                  : usersLoadError
                    ? undefined
                    : availableUsers.length === 0
                      ? 'No users available. Create a user with role Agent in Users first, or all such users already have a profile.'
                      : undefined
              }
            >
          
              <MenuItem value="">
                {usersLoading ? 'Loading…' : 'Select user…'}
              </MenuItem>
              {!usersLoading && availableUsers.length === 0 ? (
                <MenuItem value="" disabled>No users available for new agent profile</MenuItem>
              ) : (
                availableUsers.map((u) => (
                  <MenuItem key={u._id} value={u._id}>
                    {u.name} — {u.email}
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              fullWidth
              label="Phone"
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
            />
            <TextField
              fullWidth
              label="Skills (comma-separated)"
              value={createSkills}
              onChange={(e) => setCreateSkills(e.target.value)}
              placeholder="e.g. Deep cleaning, Carpet"
            />
            <TextField
              fullWidth
              type="number"
              label="Daily capacity"
              value={createDailyCapacity}
              onChange={(e) => setCreateDailyCapacity(Number(e.target.value) || 5)}
              inputProps={{ min: 1 }}
            />
            <TextField
              fullWidth
              label="Experience"
              value={createExperience}
              onChange={(e) => setCreateExperience(e.target.value)}
              placeholder="e.g. 2 years"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={createLoading || !selectValue}>
            {createLoading ? 'Creating…' : 'Add agent profile'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={availabilityDialog.open}
        onClose={() => !availabilitySaving && setAvailabilityDialog({ open: false, agent: null, value: 'available' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Update availability</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {availabilityDialog.agent && (
              <>Agent: <strong>{userName(availabilityDialog.agent)}</strong></>
            )}
          </Typography>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {availabilityError && <Alert severity="error">{availabilityError}</Alert>}
            <TextField
              select
              fullWidth
              label="Availability"
              value={availabilityDialog.value}
              onChange={(e) =>
                setAvailabilityDialog((d) => ({ ...d, value: e.target.value }))
              }
              disabled={availabilitySaving}
            >
              {AVAILABILITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary">
              Use &quot;Off duty&quot; for leave or holiday. Assignment eligibility is still calculated per time slot (2h gap).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAvailabilityDialog({ open: false, agent: null, value: 'available' })}
            disabled={availabilitySaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateAvailability}
            disabled={availabilitySaving}
          >
            {availabilitySaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialog.open} onClose={() => !editLoading && setEditDialog({ open: false, agent: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit agent profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {editDialog.agent && (
              <>Agent: <strong>{userName(editDialog.agent)}</strong> ({userEmail(editDialog.agent)})</>
            )}
          </Typography>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              fullWidth
              label="Phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
            <TextField
              fullWidth
              label="Skills (comma-separated)"
              value={editSkills}
              onChange={(e) => setEditSkills(e.target.value)}
              placeholder="e.g. Deep cleaning, Carpet"
            />
            <TextField
              fullWidth
              type="number"
              label="Daily capacity"
              value={editDailyCapacity}
              onChange={(e) => setEditDailyCapacity(Number(e.target.value) || 5)}
              inputProps={{ min: 1 }}
            />
            <TextField
              fullWidth
              label="Experience"
              value={editExperience}
              onChange={(e) => setEditExperience(e.target.value)}
              placeholder="e.g. 2 years"
            />
            <TextField
              select
              fullWidth
              label="Availability"
              value={editAvailability}
              onChange={(e) => setEditAvailability(e.target.value as 'available' | 'busy' | 'off_duty')}
              disabled={editLoading}
            >
              {AVAILABILITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
              disabled={editLoading}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, agent: null })} disabled={editLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateAgent} disabled={editLoading}>
            {editLoading ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Agent Report Dialog */}
      <Dialog open={reportDialog.open} onClose={() => setReportDialog({ open: false, agent: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon sx={{ color: 'primary.main' }} />
            Agent Report
          </Box>
        </DialogTitle>
        <DialogContent>
          {reportDialog.agent && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>
                {userName(reportDialog.agent)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {userEmail(reportDialog.agent)} · Last 30 days
              </Typography>
              {reportError && <Alert severity="error" sx={{ mb: 2 }}>{reportError}</Alert>}
              {reportLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : reportData ? (
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          Assignment Statistics
                        </Typography>
                        {reportData.assignmentStats.total === 0 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: 200,
                              gap: 1,
                            }}
                          >
                            <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="body2">
                              No assignments
                            </Typography>
                          </Box>
                        ) : (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie
                                    data={reportData.assignmentStats.byStatus.map((s: { _id: string; count: number }) => ({
                                      name: s._id.replace('_', ' '),
                                      value: s.count,
                                      status: s._id,
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(props) => {
                                      const { name = '', value = 0 } = props;
                                      return `${name}: ${value}`;
                                    }}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {reportData.assignmentStats.byStatus.map((s: { _id: string; count: number }, index: number) => (
                                      <Cell key={`cell-${index}`} fill={getStatusColor(s._id)} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </Box>
                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                              <Typography variant="h5" fontWeight={700}>
                                {reportData.assignmentStats.total}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total assignments
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                              {reportData.assignmentStats.byStatus.map((s: { _id: string; count: number }) => (
                                <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box
                                      sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        bgcolor: getStatusColor(s._id),
                                      }}
                                    />
                                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                      {s._id.replace('_', ' ')}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {s.count}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </>
                        )}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          Completion Rate
                        </Typography>
                        {reportData.completionRate.total === 0 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: 200,
                              gap: 1,
                            }}
                          >
                            <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="body2">
                              No assignments
                            </Typography>
                          </Box>
                        ) : (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      {
                                        name: 'Completed',
                                        value: reportData.completionRate.completed,
                                      },
                                      {
                                        name: 'Not Completed',
                                        value: reportData.completionRate.total - reportData.completionRate.completed,
                                      },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                  >
                                    <Cell fill={STATUS_COLORS.completed} />
                                    <Cell fill="#E7E9F0" />
                                  </Pie>
                                  <RechartsTooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography
                                variant="h5"
                                fontWeight={700}
                                sx={{
                                  color: reportData.completionRate.completionRate >= 80 ? STATUS_COLORS.completed : reportData.completionRate.completionRate >= 50 ? STATUS_COLORS.in_progress : STATUS_COLORS.pending,
                                }}
                              >
                                {reportData.completionRate.completionRate}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {reportData.completionRate.completed} completed out of {reportData.completionRate.total} total assignments
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Task Trends (Last 30 Days)
                    </Typography>
                    {reportData.taskTrends.length === 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 220,
                          gap: 1,
                        }}
                      >
                        <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
                        <Typography color="text.secondary" variant="body2">
                          No task data available
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ mt: 1 }}>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart
                            data={reportData.taskTrends.map((trend: { _id: string; assigned: number; completed: number; cancelled: number }) => ({
                              date: trend._id,
                              assigned: trend.assigned,
                              completed: trend.completed,
                              cancelled: trend.cancelled || 0,
                            }))}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={STATUS_COLORS.in_progress} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={STATUS_COLORS.in_progress} stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={STATUS_COLORS.completed} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={STATUS_COLORS.completed} stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={STATUS_COLORS.cancelled} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={STATUS_COLORS.cancelled} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F0" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v: string) => (v ? v.slice(5) : '')}
                            />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <RechartsTooltip
                              contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: 'divider' }}
                              formatter={(value: number | undefined) => [value ?? 0, '']}
                              labelFormatter={(label: string) => `Date: ${label}`}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: 20 }}
                              iconType="circle"
                              formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
                            />
                            <Area
                              type="monotone"
                              dataKey="assigned"
                              stroke={STATUS_COLORS.in_progress}
                              fillOpacity={1}
                              fill="url(#colorAssigned)"
                              name="Assigned"
                            />
                            <Area
                              type="monotone"
                              dataKey="completed"
                              stroke={STATUS_COLORS.completed}
                              fillOpacity={1}
                              fill="url(#colorCompleted)"
                              name="Completed"
                            />
                            <Area
                              type="monotone"
                              dataKey="cancelled"
                              stroke={STATUS_COLORS.cancelled}
                              fillOpacity={1}
                              fill="url(#colorCancelled)"
                              name="Cancelled"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      All Tasks Assigned ({tasksTotal})
                    </Typography>
                    {tasksError && <Alert severity="error" sx={{ mb: 2 }}>{tasksError}</Alert>}
                    {tasksLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : agentTasks.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No tasks assigned
                      </Typography>
                    ) : (
                      <>
                        <CompactTable containerSx={{ maxHeight: 400 }} stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Company</TableCell>
                              <TableCell>Contact</TableCell>
                              <TableCell>Cleaning Type</TableCell>
                              <TableCell>Scheduled Date</TableCell>
                              <TableCell>Assigned Date</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {agentTasks.map((assignment) => {
                              const assignedDate = assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : '—';
                              const scheduledDate = assignment.scheduleId?.date 
                                ? new Date(assignment.scheduleId.date).toLocaleDateString() 
                                : '—';
                              
                              const leadId = assignment.leadId;
                              const companyName = leadId?.client?.companyName || leadId?.client?.contactPerson || '—';
                              const contactPerson = leadId?.client?.contactPerson || '—';
                              const cleaningType = leadId?.cleaningDetails?.cleaningType || leadId?.cleaningDetails?.category || '—';
                              
                              return (
                                <TableRow key={assignment._id} hover>
                                  <TableCell sx={{ fontWeight: 500 }}>
                                    {companyName !== '—' ? companyName : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {contactPerson !== '—' ? contactPerson : '—'}
                                  </TableCell>
                                  <TableCell sx={{ textTransform: 'capitalize' }}>
                                    {cleaningType !== '—' ? cleaningType : '—'}
                                  </TableCell>
                                  <TableCell>{scheduledDate}</TableCell>
                                  <TableCell>{assignedDate}</TableCell>
                                  <TableCell>
                                    <Typography sx={{ color: getStatusColor(assignment.status), fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                                      {assignment.status.replace('_', ' ')}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </CompactTable>
                        {tasksTotal > tasksLimit && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                            <Pagination
                              count={Math.ceil(tasksTotal / tasksLimit)}
                              page={tasksPage}
                              onChange={(_, value) => {
                                if (reportDialog.agent) {
                                  loadAgentTasks(reportDialog.agent._id, value);
                                }
                              }}
                              color="primary"
                              size="small"
                            />
                          </Box>
                        )}
                      </>
                    )}
                  </Paper>
                </Stack>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog({ open: false, agent: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
