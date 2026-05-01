import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { BigRock, Interrupt, Stats, WeeklyTask } from '../types';

function Kpi({ title, value, color = 'text.primary', to }: {
  title: string;
  value: number | string;
  color?: string;
  to?: string;
}) {
  const content = (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">{title}</Typography>
        <Typography variant="h3" sx={{ color, mt: 1 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function statusColor(s: string): any {
  if (s === 'At Risk' || s === 'Blocked') return 'error';
  if (s === 'Done') return 'success';
  if (s === 'In Progress' || s === 'Investigating') return 'warning';
  return 'default';
}

function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rocks, setRocks] = useState<BigRock[]>([]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [interrupts, setInterrupts] = useState<Interrupt[]>([]);
  const [weeklyNote, setWeeklyNote] = useState('');

  const weekStart = mondayOf(new Date());

  useEffect(() => {
    api.get<Stats>('/stats').then((r) => setStats(r.data));
    api.get<BigRock[]>('/big-rocks').then((r) => setRocks(r.data));
    api
      .get<WeeklyTask[]>('/weekly-tasks', { params: { week_start: weekStart } })
      .then((r) => setTasks(r.data));
    api.get<Interrupt[]>('/interrupts').then((r) =>
      setInterrupts(r.data.filter((i) => i.status === 'Open' || i.status === 'Investigating'))
    );
    api.get('/weekly-notes', { params: { week_start: weekStart } }).then((r: any) =>
      setWeeklyNote(r.data.content || '')
    );
  }, []);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Overview</Typography>

      <Grid container spacing={2}>
        <Grid item xs={6} md={4}>
          <Kpi
            title="Big Rocks"
            value={stats?.big_rocks_total ?? '—'}
            color="error.main"
            to="/big-rocks"
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <Kpi
            title="Tasks"
            value={stats?.tasks_this_week ?? '—'}
            color="warning.main"
            to="/weekly"
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <Kpi
            title="Interrupts"
            value={stats?.interrupts_open ?? '—'}
            color="error.main"
            to="/interrupts"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Big Rocks */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Big Rocks</Typography>
            <Stack spacing={1}>
              {rocks.length === 0 && (
                <Typography color="text.secondary">No rocks defined yet.</Typography>
              )}
              {rocks.map((r) => (
                <Box
                  key={r.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Chip label={r.status} size="small" color={statusColor(r.status)} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>{r.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.owner_name || '—'} · {r.progress_pct}%
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Current Tasks */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Current Tasks</Typography>
            {tasks.length === 0 && (
              <Typography color="text.secondary">No tasks logged yet for this week.</Typography>
            )}
            <Stack spacing={0.5}>
              {tasks.map((t) => (
                <Box
                  key={t.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Chip label={t.priority} size="small" />
                  <Chip
                    label={t.status}
                    size="small"
                    color={statusColor(t.status)}
                  />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>{t.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.owner_name || '—'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Interrupts */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Interrupts</Typography>
            {interrupts.length === 0 && (
              <Typography color="text.secondary">No open interrupts.</Typography>
            )}
            <Stack spacing={1}>
              {interrupts.map((i) => (
                <Box
                  key={i.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Chip label={i.severity} size="small" color={i.severity === 'Sev1' || i.severity === 'Sev2' ? 'error' : 'default'} />
                  <Chip label={i.status} size="small" color={statusColor(i.status)} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>{i.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {i.owner_name || '—'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Weekly Notes */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Weekly Notes</Typography>
        {weeklyNote ? (
          <Box
            sx={{ '& p': { m: 0 }, '& ul, & ol': { pl: 2 } }}
            dangerouslySetInnerHTML={{ __html: weeklyNote }}
          />
        ) : (
          <Typography color="text.secondary">No notes for this week yet.</Typography>
        )}
      </Paper>
    </Stack>
  );
}
