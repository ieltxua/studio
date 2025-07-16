import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, SmartToy } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
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
        backgroundColor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 2,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
          <SmartToy sx={{ fontSize: 48, color: 'primary.main' }} />
        </Box>
        
        <Typography variant="h4" align="center" fontWeight={700} gutterBottom>
          Studio AI
        </Typography>
        
        <Typography variant="body2" align="center" color="text.secondary" mb={4}>
          Executive Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoFocus
            autoComplete="email"
          />
          
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </form>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/forgot-password')}
            sx={{ textDecoration: 'none' }}
          >
            Forgot password?
          </Link>
          
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/register')}
            sx={{ textDecoration: 'none' }}
          >
            Create account
          </Link>
        </Box>

        <Box mt={4} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" align="center" display="block" color="text.secondary">
            Demo credentials: demo@studio.ai / demo123
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};