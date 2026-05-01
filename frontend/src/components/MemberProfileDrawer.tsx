import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../api';
import type { BigRock, Interrupt, Member, WeeklyTask } from '../types';

interface Props {
  member: Member | null;
  onClose: () => void;
}

function statusColor(s: string): any {
  if (s === 'At Risk' || s === 'Blocked' || s === 'Open') return 'error';
  if (s === 'Done' || s === 'Closed' || s === 'Mitigated') return 'success';
  if (s === 'In Progress' || s === 'Investigating') return 'warning';
  return 'default';
}

function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

function initials(name: string): string {
  const p = name.replace(',', '').trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function MemberProfileDrawer({ member, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [rocks, setRocks] = useState<BigRock[]>([]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [interrupts, setInterrupts] = useState<Interrupt[]>([]);

  useEffect(() => {
    if (!member) return;
    const id = member.id;
    api.get<BigRock[]>('/big-rocks', { params: { owner_id: id } }).then((r) =>
      setRocks(r.data),
    );
    api
      .get<WeeklyTask[]>('/weekly-tasks', {
        params: { owner_id: id, week_start: mondayOf(new Date()) },
      })
      .then((r) => setTasks(r.data));
    api
      .get<Interrupt[]>('/interrupts', { params: { owner_id: id } })
      .then((r) => setInterrupts(r.data));
  }, [member]);

  if (!member) return null;
  const openInterrupts = interrupts.filter(
    (i) => i.status === 'Open' || i.status === 'Investigating',
  );

  return (
    <Drawer anchor="right" open={!!member} onClose={onClose}>
      <Box sx={{ width: 480, p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Avatar sx={{ width: 56, height: 56, fontWeight: 700 }}>
            {initials(member.name)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {member.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {member.role}
            </Typography>
            {member.location && (
              <Typography variant="caption" color="text.secondary">
                {member.location}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Tab label={`Big Rocks (${rocks.length})`} />
          <Tab label={`This Week (${tasks.length})`} />
          <Tab label={`Interrupts (${openInterrupts.length} open)`} />
        </Tabs>

        {tab === 0 && (
          <Stack spacing={1}>
            {rocks.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No big rocks owned.
              </Typography>
            )}
            {rocks.map((r) => (
              <Box
                key={r.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip label={r.status} size="small" color={statusColor(r.status)} />
                  <Chip label={r.quarter || '—'} size="small" variant="outlined" />
                  <Box sx={{ flexGrow: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {r.progress_pct}%
                  </Typography>
                </Stack>
                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                  {r.title}
                </Typography>
                {r.description && (
                  <Typography variant="caption" color="text.secondary">
                    {r.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={1}>
            {tasks.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No tasks logged for this week.
              </Typography>
            )}
            {tasks.map((t) => (
              <Box
                key={t.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip label={t.priority} size="small" />
                  <Chip label={t.status} size="small" color={statusColor(t.status)} />
                  {t.big_rock_title && (
                    <Chip
                      label={t.big_rock_title}
                      size="small"
                      variant="outlined"
                      sx={{ maxWidth: 180 }}
                    />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {t.title}
                </Typography>
                {t.notes && (
                  <Typography variant="caption" color="text.secondary">
                    {t.notes}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={1}>
            {interrupts.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No customer interrupts assigned.
              </Typography>
            )}
            {interrupts.map((i) => (
              <Box
                key={i.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip
                    label={i.severity}
                    size="small"
                    color={
                      i.severity === 'Sev1' || i.severity === 'Sev2'
                        ? 'error'
                        : 'default'
                    }
                  />
                  <Chip label={i.status} size="small" color={statusColor(i.status)} />
                  <Chip
                    label={i.customer}
                    size="small"
                    variant="outlined"
                  />
                  <Box sx={{ flexGrow: 1 }} />
                  {i.hours_spent > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {i.hours_spent}h
                    </Typography>
                  )}
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {i.title}
                </Typography>
                {i.description && (
                  <Typography variant="caption" color="text.secondary">
                    {i.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
