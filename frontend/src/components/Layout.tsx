import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import UserPicker from './UserPicker';
import ActivityDrawer from './ActivityDrawer';
import PickUserGate from './PickUserGate';
import ActiveUsers from './ActiveUsers';
import { api } from '../api';
import { useUserStore } from '../store';
import { useWebSocket } from '../useWebSocket';
import type { Member } from '../types';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/big-rocks', label: 'Big Rocks' },
  { to: '/weekly', label: 'Weekly' },
  { to: '/interrupts', label: 'Interrupts' },
  { to: '/team', label: 'Team' },
  { to: '/export', label: 'Export' },
];

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { currentUser, setCurrentUser } = useUserStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  useWebSocket(
    useCallback((msg) => {
      if (msg.type === 'presence') {
        setActiveUsers(msg.users as string[]);
      }
    }, []),
  );

  useEffect(() => {
    api.get<Member[]>('/members').then((r) => setMembers(r.data)).catch(() => {});
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ color: 'text.primary', textDecoration: 'none', fontWeight: 700, mr: 4 }}
          >
            Team Dashboard
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {NAV.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.to === '/'}
                sx={{
                  color: 'text.secondary',
                  '&.active': { color: 'primary.main', fontWeight: 700 },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <ActiveUsers users={activeUsers} />

          <IconButton onClick={() => setDrawerOpen(true)} title="Activity log" sx={{ ml: 2 }}>
            <HistoryIcon />
          </IconButton>
          <Box sx={{ ml: 2 }}>
            <UserPicker />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 4 } }}>
        <Outlet />
      </Container>

      <ActivityDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <PickUserGate
        open={!currentUser}
        members={members}
        onPicked={(name) => setCurrentUser(name)}
      />
    </Box>
  );
}
