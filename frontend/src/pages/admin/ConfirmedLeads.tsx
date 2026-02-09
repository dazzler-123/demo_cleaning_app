import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi, assignmentsApi, agentsApi, schedulesApi } from '@/api/endpoints';
import type { Lead, Schedule, Agent, Assignment } from '@/types';
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
import CompactTable, { TABLE_FONT_FAMILY } from '@/components/CompactTable';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SortPopover, { type SortOption } from '@/components/SortPopover';
import Skeleton from '@mui/material/Skeleton';
import Paper from '@mui/material/Paper';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import { getStatusColor } from '@/utils/statusColors';
export default function ConfirmedLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leadSchedules, setLeadSchedules] = useState<Record<string, Schedule>>({});
  const [leadAssignments, setLeadAssignments] = useState<Record<string, Assignment>>({});
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Schedule popover state
  const [schedulePopoverAnchor, setSchedulePopoverAnchor] = useState<HTMLElement | null>(null);
  const [selectedLeadForSchedule, setSelectedLeadForSchedule] = useState<Lead | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Assignment popover state
  const [assignmentPopoverAnchor, setAssignmentPopoverAnchor] = useState<HTMLElement | null>(null);
  const [selectedScheduleForAssignment, setSelectedScheduleForAssignment] = useState<Schedule | null>(null);
  const [selectedLeadForAssignment, setSelectedLeadForAssignment] = useState<Lead | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [eligibleAgentIds, setEligibleAgentIds] = useState<string[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);

  // Calculate duration from start and end time
  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    const duration = endTotalMinutes - startTotalMinutes;
    return duration > 0 ? duration : 0;
  };

  const calculatedDuration = calculateDuration(startTime, endTime);

  // Convert time slot to 24-hour format (e.g., "11:00 AM" -> "11:00")
  const timeSlotTo24Hour = (timeSlot: string): string => {
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 = hours + 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Convert 24-hour format to time slot (e.g., "11:00" -> "11:00 AM")
  const formatTimeSlot = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate end time from start time and duration
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    if (!start) return '';
    const [startHours, startMinutes] = start.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = startTotalMinutes + durationMinutes;
    const endHours = Math.floor(endTotalMinutes / 60);
    const endMins = endTotalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; search?: string; scheduleStatus?: string; assignmentStatus?: string; sortField?: string; sortDirection?: 'asc' | 'desc' } = {
        page,
        limit: 10,
      };
      // Only include search if it has at least 3 characters
      if (debouncedSearch && debouncedSearch.length >= 3) {
        params.search = debouncedSearch;
      }
      if (scheduleStatus) params.scheduleStatus = scheduleStatus;
      if (assignmentStatus) params.assignmentStatus = assignmentStatus;
      if (sortField) {
        params.sortField = sortField;
        params.sortDirection = sortDirection;
      }
      
      const res = await leadsApi.getConfirmed(params);
      setLeads(res.data.items);
      setTotal(res.data.total);

      // Extract schedules and assignments from enriched lead data
      const schedulesMap: Record<string, Schedule> = {};
      const assignmentsMap: Record<string, Assignment> = {};
      
      res.data.items.forEach((lead: Lead & { schedule?: Schedule; assignment?: Assignment }) => {
        if (lead.schedule) {
          schedulesMap[lead._id] = lead.schedule;
        }
        if (lead.assignment) {
          assignmentsMap[lead._id] = lead.assignment;
        }
      });
      
      setLeadSchedules(schedulesMap);
      setLeadAssignments(assignmentsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, scheduleStatus, assignmentStatus, sortField, sortDirection]);

  // Debounce search: wait 500ms after user stops typing, and only search if >= 3 characters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length === 0 || search.length >= 3) {
        setDebouncedSearch(search);
        setPage(1); // Reset to first page when search changes
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Load eligible agents when schedule is selected for assignment
  useEffect(() => {
    if (!selectedScheduleForAssignment || !assignmentPopoverAnchor) {
      setEligibleAgentIds([]);
      return;
    }
    setEligibleLoading(true);
    assignmentsApi
      .getEligibleAgents(selectedScheduleForAssignment._id)
      .then((res) => setEligibleAgentIds(res.data?.eligibleAgentIds ?? []))
      .catch(() => setEligibleAgentIds([]))
      .finally(() => setEligibleLoading(false));
  }, [selectedScheduleForAssignment, assignmentPopoverAnchor]);

  // Load agents when assignment popover opens
  useEffect(() => {
    if (assignmentPopoverAnchor) {
      agentsApi
        .list({ limit: 200, status: 'active' })
        .then((res) => {
          const agentData = res?.data as { items?: Agent[] } | undefined;
          setAgents(Array.isArray(agentData?.items) ? agentData.items : []);
        })
        .catch(() => setAgents([]));
    }
  }, [assignmentPopoverAnchor]);

  const openSchedulePopover = (event: React.MouseEvent<HTMLElement>, lead: Lead, schedule?: Schedule) => {
    if (lead.assignmentStatus === 'assigned') return; // Cannot edit if assigned
    
    setSelectedLeadForSchedule(lead);
    setSchedulePopoverAnchor(event.currentTarget);
    setScheduleError('');

    if (schedule) {
      // Edit mode - populate with existing schedule data
      const scheduleDateObj = new Date(schedule.date);
      setScheduleDate(scheduleDateObj.toISOString().slice(0, 10));
      const start24 = timeSlotTo24Hour(schedule.timeSlot);
      setStartTime(start24);
      const end24 = calculateEndTime(start24, schedule.duration);
      setEndTime(end24);
      setScheduleNotes(schedule.notes || '');
    } else {
      // Create mode - reset fields
      setScheduleDate('');
      setStartTime('');
      setEndTime('');
      setScheduleNotes('');
    }
  };

  const closeSchedulePopover = () => {
    setSchedulePopoverAnchor(null);
    setSelectedLeadForSchedule(null);
    setScheduleDate('');
    setStartTime('');
    setEndTime('');
    setScheduleNotes('');
    setScheduleError('');
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (number | null)[] = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    setScheduleDate(formatDateForInput(selectedDate));
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateSelected = (day: number) => {
    if (!scheduleDate) return false;
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    return formatDateForInput(date) === scheduleDate;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleSchedule = async (lead: Lead) => {
    if (!scheduleDate || !startTime || !endTime) {
      setScheduleError('Please fill in all required fields');
      return;
    }

    if (calculatedDuration <= 0) {
      setScheduleError('End time must be after start time');
      return;
    }

    // Verify lead status before scheduling
    if (lead.status !== 'confirm') {
      setScheduleError(`This lead is not in "confirm" status. Current status: ${lead.status}. Please refresh the page and try again.`);
      return;
    }

    setScheduleError('');
    setScheduleLoading(true);
    try {
      // Refresh lead data before scheduling to ensure status is current
      const refreshedLead = await leadsApi.get(lead._id);
      if (refreshedLead.data.status !== 'confirm') {
        setScheduleError(`This lead is no longer in "confirm" status. Current status: ${refreshedLead.data.status}. Please refresh the page.`);
        setScheduleLoading(false);
        return;
      }

      const existingSchedule = leadSchedules[lead._id];
      if (existingSchedule) {
        // Update existing schedule
        await schedulesApi.update(existingSchedule._id, {
          date: scheduleDate,
          timeSlot: formatTimeSlot(startTime),
          duration: calculatedDuration,
          notes: scheduleNotes || undefined,
        });
        closeSchedulePopover();
        loadLeads(); // Reload to refresh the list
      } else {
        // Create new schedule
        await schedulesApi.create({
          leadId: lead._id,
          date: scheduleDate,
          timeSlot: formatTimeSlot(startTime),
          duration: calculatedDuration,
          notes: scheduleNotes || undefined,
        });
        closeSchedulePopover();
        // Assignment will be handled separately via the Agent column
        loadLeads(); // Reload to refresh the list
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save schedule';
      if (errorMessage.includes('confirm status')) {
        setScheduleError('This lead is not in "confirm" status. Please refresh the page and ensure the lead status is "confirm" before scheduling.');
      } else {
        setScheduleError(errorMessage);
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  const openAssignmentPopover = (event: React.MouseEvent<HTMLElement>, lead: Lead, schedule: Schedule) => {
    if (lead.assignmentStatus === 'assigned') return; // Cannot assign if already assigned
    
    setSelectedLeadForAssignment(lead);
    setSelectedScheduleForAssignment(schedule);
    setSelectedAgentId('');
    setAssignmentNotes('');
    setAssignmentError('');
    setAssignmentPopoverAnchor(event.currentTarget);
  };

  const closeAssignmentPopover = () => {
    setAssignmentPopoverAnchor(null);
    setSelectedLeadForAssignment(null);
    setSelectedScheduleForAssignment(null);
    setSelectedAgentId('');
    setAssignmentNotes('');
    setAssignmentError('');
  };

  const handleAssignAgent = async () => {
    if (!selectedScheduleForAssignment || !selectedAgentId || !selectedLeadForAssignment) {
      setAssignmentError('Please select an agent');
      return;
    }

    setAssignmentError('');
    setAssignmentLoading(true);
    try {
      await assignmentsApi.create({
        leadId: selectedLeadForAssignment._id,
        scheduleId: selectedScheduleForAssignment._id,
        agentId: selectedAgentId,
        notes: assignmentNotes.trim() || undefined,
      });
      closeAssignmentPopover();
      loadLeads(); // Reload to refresh the list
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : 'Failed to assign agent');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const agentLabel = (a: Agent) => {
    const u = a.userId && typeof a.userId === 'object' ? a.userId : null;
    return u ? `${u.name} (${u.email})` : a._id;
  };

  const getAssignedAgentName = (leadId: string): string => {
    const assignment = leadAssignments[leadId];
    if (!assignment || !assignment.agentId) return '—';
    if (typeof assignment.agentId === 'object') {
      // Check if userId is populated (object) or just an ID (string)
      if (assignment.agentId.userId && typeof assignment.agentId.userId === 'object' && 'name' in assignment.agentId.userId) {
        return assignment.agentId.userId.name;
      }
      // Fallback: try to get name from agent object directly if it exists
      if ('name' in assignment.agentId && typeof assignment.agentId.name === 'string') {
        return assignment.agentId.name;
      }
    }
    return '—';
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setPage(1); // Reset to first page when sorting changes
  };

  const sortOptions: SortOption[] = [
    { field: 'location', label: 'Location' },
    { field: 'scheduleStatus', label: 'Schedule Status' },
    { field: 'scheduleDate', label: 'Schedule Date' },
    { field: 'assignmentStatus', label: 'Assignment Status' },
  ];


  return (
    <Box>
      <PageHeader
        title="Scheduled Leads"
        // subtitle="Leads that are scheduled and ready for assignment"
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Search by company, contact, email, city, country, pass-code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            fullWidth
            sx={{ flex: { sm: 1 }, minWidth: { sm: 300 } }}
          />
          <TextField
            select
            label="Schedule Status"
            value={scheduleStatus}
            onChange={(e) => {
              setScheduleStatus(e.target.value);
              setPage(1);
            }}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="not_scheduled">Not Scheduled</MenuItem>
          </TextField>
          <TextField
            select
            label="Assignment Status"
            value={assignmentStatus}
            onChange={(e) => {
              setAssignmentStatus(e.target.value);
              setPage(1);
            }}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="not_assigned">Not Assigned</MenuItem>
          </TextField>
        </Stack>

        {loading ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} />
            ))}
          </Stack>
        ) : leads.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No scheduled leads found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {search ? 'Try adjusting your search criteria' : 'Scheduled leads will appear here'}
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
                    <TableCell>Location</TableCell>
                    {/* <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell> */}
                    {/* <TableCell>Status</TableCell> */}
                    <TableCell>Quoted Amount</TableCell>
                    <TableCell>Confirmed Amount</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Agent</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <SortPopover
                          sortOptions={sortOptions}
                          activeSortField={sortField}
                          sortDirection={sortDirection}
                          onSortChange={handleSortChange}
                        />
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                          Actions
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                            {lead.client.companyName}
                          </Typography>
                        </TableCell>
                        {/* <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{lead.client.contactPerson}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {lead.client.email}
                          </Typography>
                        </TableCell> */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                            {lead.location.city}, {lead.location.pincode}
                          </Typography>
                        </TableCell>
                        {/* <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{lead.cleaningDetails.cleaningType}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{lead.cleaningDetails.category}</Typography>
                        </TableCell> */}
                        {/* <TableCell>
                          <Chip label={lead.status} size="small" {...getStatusChipProps(lead.status)} />
                        </TableCell> */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                            {lead.quotedAmount !== undefined && lead.quotedAmount !== null
                              ? `$${lead.quotedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                            {lead.confirmedAmount !== undefined && lead.confirmedAmount !== null
                              ? `$${lead.confirmedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {leadSchedules[lead._id] ? (
                            <Tooltip title={lead.assignmentStatus === 'assigned' ? 'Cannot edit schedule - Lead is already assigned' : 'Click to edit schedule'}>
                              <Box
                                onClick={(e) => lead.assignmentStatus !== 'assigned' && openSchedulePopover(e, lead, leadSchedules[lead._id])}
                                sx={{
                                  cursor: lead.assignmentStatus === 'assigned' ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  opacity: lead.assignmentStatus === 'assigned' ? 0.6 : 1,
                                  '&:hover': lead.assignmentStatus === 'assigned' ? {} : { opacity: 0.7 },
                                }}
                              >
                                <EditIcon sx={{ fontSize: 14 }} color={lead.assignmentStatus === 'assigned' ? 'disabled' : 'primary'} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={500} sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333', lineHeight: 1.2 }}>
                                    {new Date(leadSchedules[lead._id].date).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.7rem', lineHeight: 1.2 }}>
                                    {leadSchedules[lead._id].timeSlot} ({leadSchedules[lead._id].duration}m)
                                  </Typography>
                                </Box>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Box
                              onClick={(e) => openSchedulePopover(e, lead)}
                              sx={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main', opacity: 0.7 },
                              }}
                            >
                              <CalendarMonthIcon sx={{ fontSize: 14 }} />
                              <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>Schedule</Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          {leadSchedules[lead._id] && lead.assignmentStatus !== 'assigned' ? (
                            <Box
                              onClick={(e) => openAssignmentPopover(e, lead, leadSchedules[lead._id])}
                              sx={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main', opacity: 0.7 },
                              }}
                            >
                              <PersonAddIcon sx={{ fontSize: 14 }} />
                              <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                                Assign Agent
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#333333' }}>
                              {getAssignedAgentName(lead._id)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {leadAssignments[lead._id] ? (
                            <Typography sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: getStatusColor(leadAssignments[lead._id].status), fontWeight: 500, textTransform: 'capitalize' }}>
                              {leadAssignments[lead._id].status.replace('_', ' ')}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#666666', fontWeight: 500 }}>
                              Not Assigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            <Tooltip
                              title={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <VisibilityIcon sx={{ fontSize: 16 }} />
                                  <span>View Lead</span>
                                </Box>
                              }
                            >
                              <IconButton
                                size="small"
                                component={Link}
                                to={`/admin/leads/${lead._id}/edit`}
                                color="primary"
                                sx={{ padding: 0.5 }}
                              >
                                <VisibilityIcon sx={{ fontSize: 16 }} />
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
              <Stack spacing={1.5}>
                {leads.map((lead) => (
                  <Paper key={lead._id} sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {lead.client.companyName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {lead.client.contactPerson} • {lead.client.email}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2">
                          <strong>Location:</strong> {lead.location.city}, {lead.location.pincode}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Type:</strong> {lead.cleaningDetails.cleaningType} • {lead.cleaningDetails.category}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Quoted Amount:</strong> {lead.quotedAmount !== undefined && lead.quotedAmount !== null
                            ? `$${lead.quotedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Confirmed Amount:</strong> {lead.confirmedAmount !== undefined && lead.confirmedAmount !== null
                            ? `$${lead.confirmedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </Typography>
                        <Box>
                          <Typography variant="body2">
                            <strong>Assigned Agent:</strong> {leadSchedules[lead._id] && lead.assignmentStatus !== 'assigned' ? (
                              <Box
                                component="span"
                                onClick={(e) => openAssignmentPopover(e, lead, leadSchedules[lead._id])}
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                  ml: 0.5,
                                }}
                              >
                                Assign Agent
                              </Box>
                            ) : (
                              <span>{getAssignedAgentName(lead._id)}</span>
                            )}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Typography variant="body2">
                            <strong>Task Status:</strong>
                          </Typography>
                          {leadAssignments[lead._id] ? (
                            <Typography sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: getStatusColor(leadAssignments[lead._id].status), fontWeight: 500, textTransform: 'capitalize' }}>
                              {leadAssignments[lead._id].status.replace('_', ' ')}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontFamily: TABLE_FONT_FAMILY, fontSize: '0.875rem', color: '#666666', fontWeight: 500 }}>
                              Not Assigned
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={lead.status} size="small" {...getStatusChipProps(lead.status)} />
                      </Box> */}
                      <Box
                        onClick={(e) => lead.assignmentStatus !== 'assigned' && (leadSchedules[lead._id] ? openSchedulePopover(e, lead, leadSchedules[lead._id]) : openSchedulePopover(e, lead))}
                        sx={{
                          cursor: lead.assignmentStatus === 'assigned' ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          opacity: lead.assignmentStatus === 'assigned' ? 0.6 : 1,
                          '&:hover': lead.assignmentStatus === 'assigned' ? {} : {
                            bgcolor: 'action.hover',
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        {leadSchedules[lead._id] ? (
                          <>
                            <EditIcon fontSize="small" color={lead.assignmentStatus === 'assigned' ? 'disabled' : 'primary'} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {new Date(leadSchedules[lead._id].date).toLocaleDateString()} at {leadSchedules[lead._id].timeSlot}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Duration: {leadSchedules[lead._id].duration} min
                                {lead.assignmentStatus === 'assigned' ? ' • Assigned' : ' • Click to edit'}
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <>
                            <CalendarMonthIcon fontSize="small" color="disabled" />
                            <Typography variant="body2" color="text.secondary">
                              Click to schedule
                            </Typography>
                          </>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip
                          title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <VisibilityIcon sx={{ fontSize: 16 }} />
                              <span>View Lead</span>
                            </Box>
                          }
                        >
                          <IconButton
                            size="small"
                            component={Link}
                            to={`/admin/leads/${lead._id}/edit`}
                            color="primary"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>

            {total > 10 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(total / 10)}
                  page={page}
                  onChange={(_e, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Card>


      {/* Schedule Popover */}
      <Popover
        open={Boolean(schedulePopoverAnchor)}
        anchorEl={schedulePopoverAnchor}
        onClose={closeSchedulePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{ mt: 0.5 }}
      >
        <Box sx={{ p: 2, minWidth: 320, maxWidth: 400 }}>
          {scheduleError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>
              {scheduleError}
            </Alert>
          )}
          {selectedLeadForSchedule && (
            <Box sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                {selectedLeadForSchedule.client.companyName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {selectedLeadForSchedule.client.contactPerson} • {selectedLeadForSchedule.location.city}
              </Typography>
            </Box>
          )}
          <Stack spacing={1.5}>
            {/* Selected Date Display */}
            {scheduleDate && (
              <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 1, mb: 1 }}>
                <Typography variant="caption" color="primary.contrastText" sx={{ fontSize: '0.75rem' }}>
                  Selected: {new Date(scheduleDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </Box>
            )}
            
            {/* Calendar */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                minWidth: 280,
              }}
            >
              {/* Calendar Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <IconButton size="small" onClick={() => navigateMonth('prev')}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle2" fontWeight={600}>
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Typography>
                <IconButton size="small" onClick={() => navigateMonth('next')}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
              
              {/* Calendar Days Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Typography
                    key={day}
                    variant="caption"
                    sx={{
                      textAlign: 'center',
                      fontWeight: 600,
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      py: 0.5,
                    }}
                  >
                    {day}
                  </Typography>
                ))}
              </Box>
              
              {/* Calendar Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {getDaysInMonth(calendarMonth).map((day, index) => {
                  if (day === null) {
                    return <Box key={`empty-${index}`} sx={{ aspectRatio: '1' }} />;
                  }
                  const disabled = isDateDisabled(day);
                  const selected = isDateSelected(day);
                  return (
                    <Box
                      key={day}
                      onClick={() => !disabled && handleDateSelect(day)}
                      sx={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        bgcolor: selected ? 'primary.main' : 'transparent',
                        color: selected ? 'primary.contrastText' : disabled ? 'text.disabled' : 'text.primary',
                        fontWeight: selected ? 600 : 400,
                        fontSize: '0.875rem',
                        '&:hover': disabled
                          ? {}
                          : {
                              bgcolor: selected ? 'primary.dark' : 'action.hover',
                            },
                      }}
                    >
                      {day}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                disabled={scheduleLoading}
              />
              <TextField
                size="small"
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: startTime || undefined }}
                fullWidth
                disabled={scheduleLoading}
                error={!!(endTime && calculatedDuration <= 0)}
                helperText={endTime && calculatedDuration <= 0 ? 'Must be after start' : undefined}
              />
            </Box>
            {startTime && endTime && calculatedDuration > 0 && (
              <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.7rem' }}>
                Duration: {Math.floor(calculatedDuration / 60)}h {calculatedDuration % 60}m
              </Typography>
            )}
            <TextField
              size="small"
              label="Notes (optional)"
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
              disabled={scheduleLoading}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={closeSchedulePopover}
                  disabled={scheduleLoading}
                  style={{ width: '100%' }}
                >
                  Cancel
                </Button>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => selectedLeadForSchedule && handleSchedule(selectedLeadForSchedule)}
                  disabled={scheduleLoading || !scheduleDate || !startTime || !endTime || calculatedDuration <= 0 || !selectedLeadForSchedule}
                  style={{ width: '100%' }}
                >
                  {scheduleLoading ? 'Saving...' : selectedLeadForSchedule && leadSchedules[selectedLeadForSchedule._id] ? 'Update' : 'Create'}
                </Button>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Popover>

      {/* Assign Agent Popover */}
      <Popover
        open={Boolean(assignmentPopoverAnchor)}
        anchorEl={assignmentPopoverAnchor}
        onClose={closeAssignmentPopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{ mt: 0.5 }}
      >
        <Box sx={{ p: 2, minWidth: 320, maxWidth: 400 }}>
          {assignmentError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>
              {assignmentError}
            </Alert>
          )}
          {selectedLeadForAssignment && selectedScheduleForAssignment && (
            <Box sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                {selectedLeadForAssignment.client.companyName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {selectedLeadForAssignment.client.contactPerson} • {selectedLeadForAssignment.location.city}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                Schedule: {new Date(selectedScheduleForAssignment.date).toLocaleDateString()} at {selectedScheduleForAssignment.timeSlot}
              </Typography>
            </Box>
          )}
          <Stack spacing={1.5}>
            {eligibleLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <TextField
                select
                size="small"
                fullWidth
                label="Select Agent"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                SelectProps={{ displayEmpty: true }}
                required
                disabled={eligibleLoading}
                helperText={
                  eligibleAgentIds.length > 0
                    ? `${eligibleAgentIds.length} eligible agent(s) available`
                    : 'No eligible agents found for this schedule'
                }
              >
                <MenuItem value="">Select an agent…</MenuItem>
                {agents
                  .filter((agent) => eligibleAgentIds.length === 0 || eligibleAgentIds.includes(agent._id))
                  .map((agent) => {
                    const isEligible = eligibleAgentIds.length === 0 || eligibleAgentIds.includes(agent._id);
                    const availabilityStatus = agent.availability || 'available';
                    const availabilityLabel = availabilityStatus === 'off_duty' ? 'Off Duty' : availabilityStatus === 'busy' ? 'Busy' : 'Available';
                    return (
                      <MenuItem key={agent._id} value={agent._id} disabled={!isEligible}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box>
                            {agentLabel(agent)}
                            {!isEligible && ' (Not eligible)'}
                          </Box>
                          <Chip
                            label={availabilityLabel}
                            size="small"
                            sx={{
                              ml: 1,
                              bgcolor: availabilityStatus === 'available' ? '#39A547' : availabilityStatus === 'busy' ? '#F07E2F' : '#E7E9F0',
                              color: availabilityStatus === 'off_duty' ? '#333333' : '#FFFFFF',
                              fontWeight: 500,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      </MenuItem>
                    );
                  })}
              </TextField>
            )}
            <TextField
              size="small"
              fullWidth
              label="Notes (optional)"
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              multiline
              rows={2}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={closeAssignmentPopover}
                  disabled={assignmentLoading}
                  style={{ width: '100%' }}
                >
                  Cancel
                </Button>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAssignAgent}
                  disabled={assignmentLoading || !selectedAgentId || eligibleLoading}
                  style={{ width: '100%' }}
                >
                  {assignmentLoading ? 'Assigning…' : 'Assign Agent'}
                </Button>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}
