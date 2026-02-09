import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonIcon from '@mui/icons-material/Person';
import { useState } from 'react';

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 64;

const navItems: { to: string; label: string; icon: React.ReactNode }[] = [
  { to: '/agent/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/agent/tasks', label: 'My Tasks', icon: <AssignmentIcon /> },
  { to: '/agent/calendar', label: 'Job Calendar', icon: <CalendarTodayIcon /> },
];

export default function AgentLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDesktopDrawerToggle = () => {
    setDesktopOpen(!desktopOpen);
  };

  const drawer = (
    <>
      <Box sx={{ p: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: desktopOpen ? 'space-between' : 'center' }}>
        {desktopOpen && (
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              letterSpacing: 1.2,
              fontSize: '0.7rem',
            }}
          >
            CLEANING AGENT
          </Typography>
        )}
        {!isMobile && (
          <IconButton
            onClick={handleDesktopDrawerToggle}
            sx={{
              ml: desktopOpen ? 'auto' : 0,
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
            size="small"
          >
            {desktopOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Box>
      <List sx={{ flex: 1, py: 0, px: 1.5 }}>
        {desktopOpen && (
          <Typography variant="overline" sx={{ px: 1.5, pt: 1, pb: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.65rem', letterSpacing: 1.2 }}>
            PAGES
          </Typography>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={isActive}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                justifyContent: desktopOpen ? 'flex-start' : 'center',
                px: desktopOpen ? 1.5 : 1,
                '&.Mui-selected': {
                  bgcolor: 'rgba(52, 116, 242, 0.12)',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(52, 116, 242, 0.18)', color: 'primary.main' },
                  '& .MuiListItemText-primary': { fontWeight: 600 },
                },
                '& .MuiListItemText-primary': { fontSize: '0.875rem' },
              }}
            >
              <Box component="span" sx={{ mr: desktopOpen ? 1.5 : 0, display: 'flex', alignItems: 'center', color: 'inherit', justifyContent: desktopOpen ? 'flex-start' : 'center', minWidth: desktopOpen ? 'auto' : '100%' }}>
                {item.icon}
              </Box>
              {desktopOpen && <ListItemText primary={item.label} primaryTypographyProps={{ sx: { color: 'text.primary', fontWeight: 500 } }} />}
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {desktopOpen && (
          <>
            <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ fontSize: '0.875rem' }}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              Agent
            </Typography>
            <Button
              fullWidth
              size="small"
              onClick={handleLogout}
              sx={{ mt: 1, justifyContent: 'flex-start', color: 'primary.main', fontSize: '0.875rem' }}
            >
              Logout
            </Button>
          </>
        )}
        {!desktopOpen && (
          <Button
            size="small"
            onClick={handleLogout}
            sx={{ minWidth: 'auto', p: 1, color: 'primary.main' }}
            title="Logout"
          >
            <PersonIcon />
          </Button>
        )}
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="nav" sx={{ width: { md: desktopOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED }, flexShrink: { md: 0 }, transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }) }}>
        {isMobile ? (
          <>
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 56,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                px: 2,
                zIndex: theme.zIndex.drawer + 1,
              }}
            >
              <IconButton aria-label="open menu" onClick={handleDrawerToggle} edge="start">
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" component={Link} to="/agent/dashboard" sx={{ textDecoration: 'none', color: 'text.primary', fontWeight: 600, fontSize: '1rem', ml: 1 }}>
                Cleaning Agent
              </Typography>
            </Box>
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{ keepMounted: true }}
              sx={{
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: DRAWER_WIDTH,
                  top: 0,
                  height: '100%',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                },
              }}
            >
              {drawer}
            </Drawer>
          </>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: desktopOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
                top: 0,
                height: '100vh',
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }),
                overflowX: 'hidden',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          pt: { xs: 8, md: 3 },
          bgcolor: 'background.default',
          overflow: 'auto',
          width: { md: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : `calc(100% - ${DRAWER_WIDTH_COLLAPSED}px)` },
          minHeight: '100vh',
          transition: theme.transitions.create(['width', 'margin'], { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
