import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Paper from '@mui/material/Paper';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action, icon }: PageHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Paper
      elevation={0}
      sx={{
        mb: { xs: 2.5, sm: 4 },
        p: { xs: 2.5, sm: 4 },
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1.5px solid',
        borderColor: 'rgba(16, 185, 129, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.12)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, #10b981 0%, #059669 30%, #0891b2 70%, #06b6d4 100%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Stack
        direction={isMobile ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={isMobile ? 'flex-start' : 'center'}
        flexWrap="wrap"
        gap={3}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2.5 }}>
          {icon && (
            <Box
              sx={{
                p: 1.75,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 30%, #0891b2 70%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                minWidth: isMobile ? 48 : 56,
                minHeight: isMobile ? 48 : 56,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={0.5}>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                fontWeight={800}
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  color: '#051747',
                  letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, #10b981 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    color: 'text.secondary',
                    fontWeight: 500,
                    letterSpacing: '0.3px',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>
        {action && (
          <Box
            sx={{
              flexShrink: 0,
              width: { xs: '100%', sm: 'auto' },
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              '& > *': {
                width: { xs: '100%', sm: 'auto' },
              },
            }}
          >
            {action}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
