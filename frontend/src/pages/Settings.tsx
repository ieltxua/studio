import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import { Save, Business, Notifications, Security, CreditCard } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const Settings: React.FC = () => {
  const { user, currentOrganization } = useAuth();
  const [saved, setSaved] = useState(false);
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    slackNotifications: false,
    weeklyReports: true,
    costAlerts: true,
    costAlertThreshold: 1000,
    defaultView: 'dashboard',
    theme: 'light',
  });

  const handleSave = () => {
    // Save settings logic here
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Settings
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Organization Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Business color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Organization
                </Typography>
              </Box>
              
              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Organization Name
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {currentOrganization?.name}
                </Typography>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Plan
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={currentOrganization?.planType}
                    color={currentOrganization?.planType === 'ENTERPRISE' ? 'primary' : 'default'}
                    size="small"
                  />
                  <Button size="small" variant="text">
                    Upgrade
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Usage Limits
                </Typography>
                <Typography variant="caption" display="block">
                  Projects: {currentOrganization?.maxProjects} max
                </Typography>
                <Typography variant="caption" display="block">
                  Agents: {currentOrganization?.maxAgents} max
                </Typography>
                <Typography variant="caption" display="block">
                  Users: {currentOrganization?.maxUsers} max
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Notifications color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Notifications
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) =>
                      setSettings({ ...settings, emailNotifications: e.target.checked })
                    }
                  />
                }
                label="Email notifications"
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.slackNotifications}
                    onChange={(e) =>
                      setSettings({ ...settings, slackNotifications: e.target.checked })
                    }
                  />
                }
                label="Slack notifications"
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.weeklyReports}
                    onChange={(e) =>
                      setSettings({ ...settings, weeklyReports: e.target.checked })
                    }
                  />
                }
                label="Weekly reports"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.costAlerts}
                    onChange={(e) =>
                      setSettings({ ...settings, costAlerts: e.target.checked })
                    }
                  />
                }
                label="Cost alerts"
              />

              {settings.costAlerts && (
                <TextField
                  fullWidth
                  label="Alert threshold ($)"
                  type="number"
                  value={settings.costAlertThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      costAlertThreshold: parseInt(e.target.value),
                    })
                  }
                  size="small"
                  sx={{ mt: 2 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Security color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Preferences
                </Typography>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Default View</InputLabel>
                <Select
                  value={settings.defaultView}
                  label="Default View"
                  onChange={(e) =>
                    setSettings({ ...settings, defaultView: e.target.value })
                  }
                >
                  <MenuItem value="dashboard">Dashboard</MenuItem>
                  <MenuItem value="projects">Projects</MenuItem>
                  <MenuItem value="agents">Agents</MenuItem>
                  <MenuItem value="analytics">Analytics</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.theme}
                  label="Theme"
                  onChange={(e) =>
                    setSettings({ ...settings, theme: e.target.value })
                  }
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Billing */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <CreditCard color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Billing
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Payment Method
              </Typography>
              <Typography variant="body1" mb={2}>
                •••• •••• •••• 4242
              </Typography>

              <Button variant="outlined" size="small">
                Update Payment Method
              </Button>

              <Divider sx={{ my: 2 }} />

              <Button variant="text" size="small">
                Download Invoices
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              sx={{ textTransform: 'none' }}
            >
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;