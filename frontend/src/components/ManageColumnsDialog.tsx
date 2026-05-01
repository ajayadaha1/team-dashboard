import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../api';
import type { CustomColumn } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  tableName: string;
  onChanged: () => void; // callback to refresh columns
}

const COLUMN_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
];

export default function ManageColumnsDialog({ open, onClose, tableName, onChanged }: Props) {
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [loading, setLoading] = useState(false);

  const fetchColumns = async () => {
    const { data } = await api.get<CustomColumn[]>(`/custom-columns?table_name=${tableName}`);
    setColumns(data);
  };

  useEffect(() => {
    if (open) fetchColumns();
  }, [open, tableName]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await api.post('/custom-columns', {
      table_name: tableName,
      column_name: newName.trim(),
      column_type: newType,
    });
    setNewName('');
    setNewType('text');
    await fetchColumns();
    setLoading(false);
    onChanged();
  };

  const handleRemove = async (id: number) => {
    setLoading(true);
    await api.delete(`/custom-columns/${id}`);
    await fetchColumns();
    setLoading(false);
    onChanged();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Columns</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add or remove custom columns for this table.
        </Typography>

        {/* Add new column */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Column name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            select
            label="Type"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            sx={{ minWidth: 110 }}
          >
            {COLUMN_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={loading || !newName.trim()}
          >
            Add
          </Button>
        </Stack>

        {/* Existing custom columns */}
        {columns.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No custom columns yet.
          </Typography>
        ) : (
          <List dense>
            {columns.map((col) => (
              <ListItem
                key={col.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemove(col.id)} disabled={loading}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={col.column_name}
                  secondary={COLUMN_TYPES.find((t) => t.value === col.column_type)?.label ?? col.column_type}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
