import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Stack
      direction={isMobile ? 'column' : 'row'}
      justifyContent="space-between"
      alignItems={isMobile ? 'flex-start' : 'flex-start'}
      flexWrap="wrap"
      gap={2}
      sx={{ mb: { xs: 2, sm: 3 } }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' }, color: '#333333' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' }, '& > *': { width: { xs: '100%', sm: 'auto' } } }}>
          {action}
        </Box>
      )}
    </Stack>
  );
}
