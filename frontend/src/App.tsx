import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';

// Lazy load other pages
const Projects = React.lazy(() => import('@/pages/Projects'));
const Agents = React.lazy(() => import('@/pages/Agents'));
const Analytics = React.lazy(() => import('@/pages/Analytics'));
const Settings = React.lazy(() => import('@/pages/Settings'));

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="projects"
          element={
            <React.Suspense fallback={<CircularProgress />}>
              <Projects />
            </React.Suspense>
          }
        />
        <Route
          path="agents"
          element={
            <React.Suspense fallback={<CircularProgress />}>
              <Agents />
            </React.Suspense>
          }
        />
        <Route
          path="analytics"
          element={
            <React.Suspense fallback={<CircularProgress />}>
              <Analytics />
            </React.Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <React.Suspense fallback={<CircularProgress />}>
              <Settings />
            </React.Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;