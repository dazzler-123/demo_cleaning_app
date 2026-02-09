import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/endpoints';
import { ROLES } from '@/types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      setAuth(data.user, data.token);
      if (data.user.role === ROLES.AGENT) navigate('/agent/tasks');
      else navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: '#F5F7FA',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 0,
          maxWidth: 420,
          width: '100%',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Logo strip – template royal blue */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            py: 2.5,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.25rem',
            }}
          >
            C
          </Box>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: '1.25rem' }}>
            Cleaning Agent
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3, fontSize: '0.9375rem' }}>
            Sign in to your account
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && (
                <Alert severity="error" sx={{ borderRadius: '10px' }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cleaning.com"
                required
                fullWidth
                autoComplete="email"
                size="medium"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                fullWidth
                autoComplete="current-password"
                size="medium"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ mt: 1, py: 1.25, fontWeight: 600, borderRadius: '10px' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
