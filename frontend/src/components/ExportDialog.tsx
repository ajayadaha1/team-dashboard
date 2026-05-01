import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Checkbox,
  FormGroup,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { downloadExport } from '../api';

const TABLES = [
  { id: 'team_members', label: 'Team Members' },
  { id: 'big_rocks', label: 'Big Rocks' },
  { id: 'weekly_tasks', label: 'Weekly Tasks' },
  { id: 'customer_interrupts', label: 'Customer Interrupts' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTables?: string[];
}

export default function ExportDialog({ open, onClose, defaultTables }: Props) {
  const [selected, setSelected] = useState<string[]>(
    defaultTables ?? TABLES.map((t) => t.id),
  );
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleExport = async () => {
    setError(null);
    if (format === 'csv' && selected.length !== 1) {
      setError('CSV export supports exactly one table. Pick one or use XLSX.');
      return;
    }
    setBusy(true);
    try {
      await downloadExport(selected, format);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Export Data</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Pick which tables to include and the file format. Multi-table XLSX produces
            one sheet per table.
          </Typography>
          <FormGroup>
            {TABLES.map((t) => (
              <FormControlLabel
                key={t.id}
                control={
                  <Checkbox
                    checked={selected.includes(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                }
                label={t.label}
              />
            ))}
          </FormGroup>
          <FormControl size="small" sx={{ maxWidth: 200 }}>
            <Select value={format} onChange={(e) => setFormat(e.target.value as any)}>
              <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
              <MenuItem value="csv">CSV (single table)</MenuItem>
            </Select>
          </FormControl>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={busy || selected.length === 0}
        >
          {busy ? 'Exporting…' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
