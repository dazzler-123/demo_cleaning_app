import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import IconButton from '@mui/material/IconButton';
import PageHeader from '@/components/PageHeader';
import Paper from '@mui/material/Paper';

const localizer = momentLocalizer(moment);

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

export default function JobCalendar() {
  const location = useLocation();
  const scope = location.pathname.startsWith('/agent') ? 'agent' : 'admin';

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadCalendarData();
  }, [scope, currentDate, currentView]);

  const loadCalendarData = async () => {
    setLoading(true);
    setError('');
    try {
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
        const day = moment(currentDate);
        fromDate = day.format('YYYY-MM-DD');
        toDate = day.format('YYYY-MM-DD');
      }

      const assignments = scope === 'agent'
        ? await assignmentsApi.getMyTasks().then((res) => res.data)
        : await assignmentsApi.list({ limit: 1000 }).then((res) => res.data.items || []);
      const calendarEvents: CalendarEvent[] = [];

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const assignment = event.resource.data as Assignment;
    const backgroundColor = getStatusColor(assignment.status || 'pending');
    const borderColor = getStatusColor(assignment.status || 'pending');
    return {
      style: {
        backgroundColor,
        borderColor,
        color: '#fff',
        borderRadius: '8px',
        border: `2px solid ${borderColor}`,
        padding: '4px 8px',
        fontSize: '0.85rem',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.2s',
      },
    };
  };

  const CustomToolbar = ({ label, onNavigate, onView }: ToolbarProps) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      mb: 2, 
      p: 2, 
      flexWrap: 'wrap', 
      gap: 2,
      bgcolor: 'rgba(5, 23, 71, 0.02)',
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
    }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton 
          onClick={() => onNavigate('PREV')} 
          size="small"
          sx={{
            borderRadius: 2,
            '&:hover': { bgcolor: 'primary.light', color: 'primary.main' },
          }}
        >
          ←
        </IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center', color: 'text.primary' }}>
          {label}
        </Typography>
        <IconButton 
          onClick={() => onNavigate('NEXT')} 
          size="small"
          sx={{
            borderRadius: 2,
            '&:hover': { bgcolor: 'primary.light', color: 'primary.main' },
          }}
        >
          →
        </IconButton>
        <IconButton 
          onClick={() => onNavigate('TODAY')} 
          size="small" 
          sx={{ 
            ml: 1,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: '#fff',
            fontWeight: 600,
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          Today
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={1}>
        <IconButton 
          onClick={() => onView('month')} 
          size="small" 
          sx={{ 
            borderRadius: 2,
            bgcolor: currentView === 'month' ? 'primary.main' : 'transparent', 
            color: currentView === 'month' ? '#fff' : 'inherit',
            fontWeight: 600,
            '&:hover': { bgcolor: currentView === 'month' ? 'primary.dark' : 'primary.light' },
          }}
        >
          Month
        </IconButton>
        <IconButton 
          onClick={() => onView('week')} 
          size="small" 
          sx={{ 
            borderRadius: 2,
            bgcolor: currentView === 'week' ? 'primary.main' : 'transparent', 
            color: currentView === 'week' ? '#fff' : 'inherit',
            fontWeight: 600,
            '&:hover': { bgcolor: currentView === 'week' ? 'primary.dark' : 'primary.light' },
          }}
        >
          Week
        </IconButton>
        <IconButton 
          onClick={() => onView('day')} 
          size="small" 
          sx={{ 
            borderRadius: 2,
            bgcolor: currentView === 'day' ? 'primary.main' : 'transparent', 
            color: currentView === 'day' ? '#fff' : 'inherit',
            fontWeight: 600,
            '&:hover': { bgcolor: currentView === 'day' ? 'primary.dark' : 'primary.light' },
          }}
        >
          Day
        </IconButton>
      </Stack>
    </Box>
  );

  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <Tooltip
      title={
        <Box sx={{ color: '#ffffff' }}>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff' }}>{event.title}</Typography>
          <Typography variant="caption" sx={{ color: '#ffffff' }}>{moment(event.start).format('MMM DD, YYYY hh:mm A')} - {moment(event.end).format('hh:mm A')}</Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#ffffff' }}>Status: {(event.resource.data as Assignment).status}</Typography>
        </Box>
      }
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            color: '#ffffff',
          },
        },
      }}
    >
      <Box sx={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</Box>
    </Tooltip>
  );

  return (
    <Box>
      <PageHeader title="Job Calendar" subtitle={scope === 'agent' ? 'Your scheduled jobs' : 'All scheduled jobs'} />
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          border: '1px solid', 
          borderColor: 'divider', 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : (
          <>
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
                components={{ toolbar: CustomToolbar, event: CustomEvent }}
                style={{ height: '100%' }}
              />
            </Box>
            <Box sx={{ 
              mt: 3, 
              pt: 2.5, 
              borderTop: '1px solid', 
              borderColor: 'divider',
              bgcolor: 'rgba(5, 23, 71, 0.02)',
              borderRadius: 2,
              p: 2,
            }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
                Legend:
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip 
                  label="Pending" 
                  size="medium" 
                  sx={{ 
                    backgroundColor: STATUS_COLORS.pending, 
                    color: '#fff',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  }} 
                />
                <Chip 
                  label="In Progress" 
                  size="medium" 
                  sx={{ 
                    backgroundColor: STATUS_COLORS.in_progress, 
                    color: '#fff',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  }} 
                />
                <Chip 
                  label="Completed" 
                  size="medium" 
                  sx={{ 
                    backgroundColor: STATUS_COLORS.completed, 
                    color: '#fff',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  }} 
                />
              </Stack>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
