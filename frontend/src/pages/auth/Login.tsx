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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import StarIcon from '@mui/icons-material/Star';

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
        bgcolor: '#FFFFFF',
      }}
    >
      {/* Marketing Section - Left Side */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 3,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 30%, #0891b2 70%, #06b6d4 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          maxHeight: '100vh',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
            blur: '100px',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
          },
        }}
      >
        {/* Top Logo Section */}
        <Box sx={{ zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              }}
            >
              <CleaningServicesIcon sx={{ fontSize: '2rem', color: 'white' }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                  fontSize: '1.5rem',
                  letterSpacing: '-0.5px',
                }}
              >
                CleanPro
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500 }}>
                Agent Network
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h3"
            fontWeight={800}
            sx={{
              mb: 1,
              fontSize: { xs: '1.8rem', md: '2.5rem' },
              lineHeight: 1.2,
              letterSpacing: '-1px',
            }}
          >
            Earn More.
            <br />
            Work Better.
            <br />
            Grow Faster.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              opacity: 0.95,
              fontSize: '1.1rem',
              lineHeight: 1.6,
              maxWidth: '80%',
            }}
          >
            Join thousands of professional cleaning agents earning premium rates and managing their schedule on their own terms.
          </Typography>
        </Box>

        {/* Features with Icons */}
        <Stack spacing={2} sx={{ zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              p: 1.5,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(255,255,255,0.12)',
                transform: 'translateX(8px)',
              },
            }}
          >
            <CheckCircleIcon sx={{ fontSize: '1.8rem', mt: 0.5, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Smart Job Matching
              </Typography>
              <Typography variant="body2" sx={{ opacity: 1, color: 'white' }}>
                AI-powered assignments tailored to your skills and availability
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              p: 1.5,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(255,255,255,0.12)',
                transform: 'translateX(8px)',
              },
            }}
          >
            <TrendingUpIcon sx={{ fontSize: '1.8rem', mt: 0.5, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Boost Your Earnings
              </Typography>
              <Typography variant="body2" sx={{ opacity: 1, color: 'white' }}>
                Average agents earn 40% more with performance bonuses and incentives
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              p: 1.5,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(255,255,255,0.12)',
                transform: 'translateX(8px)',
              },
            }}
          >
            <GroupIcon sx={{ fontSize: '1.8rem', mt: 0.5, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Supportive Community
              </Typography>
              <Typography variant="body2" sx={{ opacity: 1, color: 'white' }}>
                Network with pros, share tips, and grow together with 500+ active agents
              </Typography>
            </Box>
          </Box>
        </Stack>

        {/* Stats with Better Styling */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            zIndex: 1,
            pt: 2,
            borderTop: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Box>
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={800}>
                500+
              </Typography>
              <Typography variant="body2" sx={{ opacity: 1, color: 'white', fontWeight: 500 }}>
                Active Agents
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Box>
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={800}>
                50K+
              </Typography>
              <Typography variant="body2" sx={{ opacity: 1, color: 'white', fontWeight: 500 }}>
                Jobs Completed
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Box>
            <Stack spacing={0.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h4" fontWeight={800}>
                  4.9
                </Typography>
                <StarIcon sx={{ fontSize: '1.5rem' }} />
              </Box>
              <Typography variant="body2" sx={{ opacity: 1, color: 'white', fontWeight: 500 }}>
                Client Rating
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Login Section - Right Side */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          bgcolor: '#F8FAFC',
          minHeight: '100vh',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4.5,
            maxWidth: 420,
            width: '100%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: '#e5e7eb',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 15px 50px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)',
            },
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                mb: 1,
                letterSpacing: '-0.5px',
              }}
            >
              Sign In
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
              Access your agent dashboard and start earning
            </Typography>
          </Box>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: '#fee2e2',
                    '& .MuiAlert-icon': { mr: 1 },
                  }}
                >
                  {error}
                </Alert>
              )}
              <TextField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                fullWidth
                autoComplete="email"
                size="medium"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    '&:hover fieldset': {
                      borderColor: '#3b82f6',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 1.5,
                  },
                }}
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
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    '&:hover fieldset': {
                      borderColor: '#3b82f6',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 1.5,
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.75,
                  fontWeight: 700,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 6px 25px rgba(16, 185, 129, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #9ca3af 0%, #d1d5db 100%)',
                  },
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Stack>
          </form>

          {/* Footer */}
          <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid', borderColor: '#e5e7eb', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Don't have an account yet?
            </Typography>
            <Button
              variant="text"
              fullWidth
              sx={{
                color: '#10b981',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': {
                  bgcolor: '#ecfdf5',
                },
              }}
            >
              Join as a New Agent
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
