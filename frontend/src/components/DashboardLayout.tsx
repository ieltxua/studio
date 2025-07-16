import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  FolderOpen,
  SmartToy,
  Assessment,
  Settings,
  Logout,
  Notifications,
  Business,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const drawerWidth = 240;

export const DashboardLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, currentOrganization, logout } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleProfileClose();
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Projects', icon: <FolderOpen />, path: '/projects' },
    { text: 'Agents', icon: <SmartToy />, path: '/agents' },
    { text: 'Analytics', icon: <Assessment />, path: '/analytics' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Box display="flex" alignItems="center" gap={1}>
          <SmartToy color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Studio AI
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      
      {currentOrganization && (
        <>
          <Box px={2} py={1.5}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Business fontSize="small" color="action" />
              <Typography variant="body2" fontWeight={500}>
                {currentOrganization.name}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={currentOrganization.planType}
              color={currentOrganization.planType === 'ENTERPRISE' ? 'primary' : 'default'}
              sx={{ height: 20 }}
            />
          </Box>
          <Divider />
        </>
      )}
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  borderRight: 3,
                  borderColor: 'primary.main',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Executive Dashboard
          </Typography>
          
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <IconButton onClick={handleProfileClick} sx={{ p: 0 }}>
            <Avatar
              alt={user?.firstName || user?.email}
              src={user?.avatar}
              sx={{ width: 36, height: 36 }}
            >
              {user?.firstName?.[0] || user?.email?.[0]}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              <Typography variant="body2">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};