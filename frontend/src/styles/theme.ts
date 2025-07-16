import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563EB',
      light: '#3B82F6',
      dark: '#1E40AF',
    },
    secondary: {
      main: '#7C3AED',
      light: '#8B5CF6',
      dark: '#6D28D9',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 2px 0px rgba(0,0,0,0.05)',
    '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.06)',
    '0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -1px rgba(0,0,0,0.06)',
    '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.05)',
    '0px 20px 25px -5px rgba(0,0,0,0.1), 0px 10px 10px -5px rgba(0,0,0,0.04)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
    '0px 25px 50px -12px rgba(0,0,0,0.25)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});