import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { api } from '../api';
import type { ActivityRow } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ActivityDrawer({ open, onClose }: Props) {
  const [rows, setRows] = useState<ActivityRow[]>([]);

  useEffect(() => {
    if (!open) return;
    api.get<ActivityRow[]>('/activity', { params: { limit: 200 } }).then((r) =>
      setRows(r.data),
    );
  }, [open]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 460, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Activity Log
        </Typography>
        <List dense>
          {rows.map((r) => (
            <ListItem key={r.id} divider sx={{ display: 'block' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                <Chip
                  label={r.action}
                  size="small"
                  color={
                    r.action === 'create'
                      ? 'success'
                      : r.action === 'delete'
                      ? 'error'
                      : 'info'
                  }
                />
                <Typography variant="caption">{r.table_name} #{r.record_id}</Typography>
                <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
                  {new Date(r.created_at).toLocaleString()}
                </Typography>
              </Box>
              <ListItemText
                primary={r.user_name || 'anonymous'}
                secondary={
                  <Typography
                    component="pre"
                    variant="caption"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                      m: 0,
                    }}
                  >
                    {r.diff_json}
                  </Typography>
                }
              />
            </ListItem>
          ))}
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No activity yet.
            </Typography>
          )}
        </List>
      </Box>
    </Drawer>
  );
}
