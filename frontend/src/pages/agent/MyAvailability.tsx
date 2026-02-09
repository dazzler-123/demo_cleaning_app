import { useEffect, useState } from 'react';
import { agentsApi } from '@/api/endpoints';
import type { Agent } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Skeleton from '@mui/material/Skeleton';

const AVAILABILITY_OPTIONS: { value: 'available' | 'busy' | 'off_duty'; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'off_duty', label: 'Off duty (leave / holiday)' },
];

export default function MyAvailability() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [value, setValue] = useState<'available' | 'busy' | 'off_duty'>('available');

  useEffect(() => {
    setLoading(true);
    setError('');
    agentsApi
      .getMe()
      .then((res) => {
        const a = res.data;
        setAgent(a);
        setValue((a?.availability as 'available' | 'busy' | 'off_duty') ?? 'available');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!agent) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await agentsApi.update(agent._id, { availability: value });
      setAgent((prev) => (prev ? { ...prev, availability: value } : null));
      setSuccess('Availability updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <PageHeader title="My availability" subtitle="Loading availability settings..." />
        <Card sx={{ maxWidth: 420 }}>
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="rectangular" width="100%" height={56} sx={{ mt: 2, borderRadius: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={36} sx={{ mt: 2, borderRadius: 1 }} />
          </Box>
        </Card>
      </Box>
    );
  }

  if (!agent) {
    return (
      <Box>
        <PageHeader title="My availability" subtitle="Update your availability status" />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography color="text.secondary">Could not load your agent profile.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="My availability"
        subtitle="Set your availability for assignments. Use &quot;Off duty&quot; for leave or holiday."
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ScheduleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Update your availability status for task assignments
        </Typography>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}
      <Card
        sx={{
          maxWidth: { xs: '100%', sm: 420 },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(5, 23, 71, 0.15)',
          },
        }}
      >
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Assignment eligibility is calculated per time slot (2-hour gap between jobs). This status is for leave or manual override.
          </Typography>
          <TextField
            select
            fullWidth
            label="Availability"
            value={value}
            onChange={(e) => setValue(e.target.value as 'available' | 'busy' | 'off_duty')}
            disabled={saving}
          >
            {AVAILABILITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
