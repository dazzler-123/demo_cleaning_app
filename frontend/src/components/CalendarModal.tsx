import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { assignmentsApi } from '@/api/endpoints';
import type { Schedule, Assignment } from '@/types';
import { STATUS_COLORS, getStatusColor } from '@/utils/statusColors';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Calendar, momentLocalizer, View, ToolbarProps } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

const localizer = momentLocalizer(moment);

interface CalendarModalProps {
  open: boolean;
  onClose: () => void;
  scope?: 'admin' | 'agent';
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'assignment';
    data: Assignment;
  };
}

export default function CalendarModal({ open, onClose, scope = 'admin' }: CalendarModalProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (open) {
      loadCalendarData();
    }
  }, [open, currentDate, currentView]);

  const loadCalendarData = async () => {
    setLoading(true);
    setError('');
    try {
      // Calculate date range based on current view and date
      let fromDate: string;
      let toDate: string;

      if (currentView === 'month') {
        const startOfMonth = moment(currentDate).startOf('month');
        const endOfMonth = moment(currentDate).endOf('month');
        fromDate = startOfMonth.format('YYYY-MM-DD');
        toDate = endOfMonth.format('YYYY-MM-DD');
      } else if (currentView === 'week') {
        const startOfWeek = moment(currentDate).startOf('week');
        const endOfWeek = moment(currentDate).endOf('week');
        fromDate = startOfWeek.format('YYYY-MM-DD');
        toDate = endOfWeek.format('YYYY-MM-DD');
      } else {
        // day view
        const day = moment(currentDate);
        fromDate = day.format('YYYY-MM-DD');
        toDate = day.format('YYYY-MM-DD');
      }

      const assignments = scope === 'agent'
        ? await assignmentsApi.getMyTasks().then((res) => res.data)
        : await assignmentsApi.list({ limit: 1000 }).then((res) => res.data.items || []);
      const calendarEvents: CalendarEvent[] = [];

      // Process assignments only
      assignments.forEach((assignment) => {
        const schedule = assignment.scheduleId as Schedule;
        if (!schedule || typeof schedule === 'string') return;

        const scheduleDate = schedule.date;
        if (!scheduleDate) return;

        const assignmentDate = moment(scheduleDate);
        const startTime = moment(schedule.timeSlot || '09:00', 'HH:mm');
        const duration = schedule.duration || 60;

        const eventStart = assignmentDate.clone().set({
          hour: startTime.hour(),
          minute: startTime.minute(),
        });
        const eventEnd = eventStart.clone().add(duration, 'minutes');

        const assignmentDateStr = assignmentDate.format('YYYY-MM-DD');
        if (assignmentDateStr < fromDate || assignmentDateStr > toDate) return;

        const lead = typeof assignment.leadId === 'object' ? assignment.leadId : null;
        const agent = typeof assignment.agentId === 'object' ? assignment.agentId : null;
        const companyName = lead?.client?.companyName || 'Unknown Company';
        const agentName = agent?.userId?.name || 'Unknown Agent';

        calendarEvents.push({
          id: `assignment-${assignment._id}`,
          title: `${companyName} - ${agentName}`,
          start: eventStart.toDate(),
          end: eventEnd.toDate(),
          resource: {
            type: 'assignment',
            data: assignment,
          },
        });
      });

      setEvents(calendarEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    const assignment = event.resource.data as Assignment;
    backgroundColor = getStatusColor(assignment.status || 'pending');
    borderColor = getStatusColor(assignment.status || 'pending');

    return {
      style: {
        backgroundColor,
        borderColor,
        color: '#fff',
        borderRadius: '4px',
        border: `2px solid ${borderColor}`,
        padding: '2px 4px',
        fontSize: '0.85rem',
      },
    };
  };

  const CustomToolbar = ({ label, onNavigate, onView }: ToolbarProps) => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, p: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => onNavigate('PREV')} size="small">
            ←
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
            {label}
          </Typography>
          <IconButton onClick={() => onNavigate('NEXT')} size="small">
            →
          </IconButton>
          <IconButton onClick={() => onNavigate('TODAY')} size="small" sx={{ ml: 1 }}>
            Today
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            onClick={() => onView('month')}
            size="small"
            sx={{ bgcolor: currentView === 'month' ? 'primary.main' : 'transparent', color: currentView === 'month' ? '#fff' : 'inherit' }}
          >
            Month
          </IconButton>
          <IconButton
            onClick={() => onView('week')}
            size="small"
            sx={{ bgcolor: currentView === 'week' ? 'primary.main' : 'transparent', color: currentView === 'week' ? '#fff' : 'inherit' }}
          >
            Week
          </IconButton>
          <IconButton
            onClick={() => onView('day')}
            size="small"
            sx={{ bgcolor: currentView === 'day' ? 'primary.main' : 'transparent', color: currentView === 'day' ? '#fff' : 'inherit' }}
          >
            Day
          </IconButton>
        </Stack>
      </Box>
    );
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {event.title}
            </Typography>
            <Typography variant="caption">
              {moment(event.start).format('MMM DD, YYYY hh:mm A')} - {moment(event.end).format('hh:mm A')}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Status: {(event.resource.data as Assignment).status}
            </Typography>
          </Box>
        }
      >
        <Box sx={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={600}>
            Schedule Calendar
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box sx={{ height: 600, mt: 2 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={setCurrentView}
              date={currentDate}
              onNavigate={setCurrentDate}
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: CustomToolbar,
                event: CustomEvent,
              }}
              style={{ height: '100%' }}
            />
            {/* Legend */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Legend:
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  label="Assignments - Pending"
                  size="small"
                  sx={{
                    backgroundColor: STATUS_COLORS.pending,
                    color: '#fff',
                  }}
                />
                <Chip
                  label="Assignments - In Progress"
                  size="small"
                  sx={{
                    backgroundColor: STATUS_COLORS.in_progress,
                    color: '#fff',
                  }}
                />
                <Chip
                  label="Assignments - Completed"
                  size="small"
                  sx={{
                    backgroundColor: STATUS_COLORS.completed,
                    color: '#fff',
                  }}
                />
              </Stack>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
