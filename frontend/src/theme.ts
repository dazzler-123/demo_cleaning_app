import { createTheme } from '@mui/material/styles';

/**
 * Admin/Agent portal theme – Materially-style template (no header bar):
 * - Primary (Royal Blue): #3474F2 / #3F51B5
 * - Main background: #F5F7FA
 * - Cards: white, 10–12px radius, subtle shadow
 * - Font: Roboto / Open Sans, hierarchy as per template
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3474F2',
      light: '#5C8FF5',
      dark: '#2A5FCC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#5C6BC0',
      light: '#7986CB',
      dark: '#3F51B5',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#4CAF50',
      light: '#66BB6A',
      dark: '#388E3C',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FFA000',
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#F44336',
      light: '#EF5350',
      dark: '#D32F2F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
      disabled: 'rgba(51, 51, 51, 0.38)',
    },
    divider: '#E0E0E0',
    action: {
      active: '#3474F2',
      hover: 'rgba(52, 116, 242, 0.08)',
      selected: 'rgba(52, 116, 242, 0.12)',
      disabled: 'rgba(51, 51, 51, 0.26)',
      disabledBackground: 'rgba(51, 51, 51, 0.08)',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Roboto", "Open Sans", "Lato", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem', color: '#333333' },
    h2: { fontWeight: 600, fontSize: '1.75rem', color: '#333333' },
    h3: { fontWeight: 600, fontSize: '1.5rem', color: '#333333' },
    h4: { fontWeight: 700, fontSize: '1.125rem', color: '#333333' },
    h5: { fontWeight: 600, fontSize: '1.125rem', color: '#333333' },
    h6: { fontWeight: 600, fontSize: '1rem', color: '#333333' },
    subtitle1: { fontSize: '1rem', fontWeight: 600, color: '#333333' },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, color: '#666666' },
    body1: { fontSize: '0.9375rem', color: '#333333' },
    body2: { fontSize: '0.875rem', color: '#666666' },
    caption: { fontSize: '0.8125rem', color: '#666666' },
    overline: { fontSize: '0.7rem', letterSpacing: 1.2, color: '#666666', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7E9F0',
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7E9F0',
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #E0E0E0',
          backgroundColor: '#FFFFFF',
          borderRadius: 0,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: 'rgba(52, 116, 242, 0.12)',
            color: '#3474F2',
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(52, 116, 242, 0.18)',
            color: '#3474F2',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: '#E7E9F0',
          backgroundColor: 'rgba(52, 116, 242, 0.08)',
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#E0E0E0',
          fontSize: '0.875rem',
          fontFamily: '"Roboto", "Open Sans", "Lato", system-ui, -apple-system, sans-serif',
          color: '#333333',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          backgroundColor: '#FAFAFA',
          color: '#333333',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#3474F2',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: '#E7E9F0',
          borderRadius: 4,
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
          },
        },
      },
    },
  },
});
