import { useState } from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useUserStore } from '../store';
import type { Member } from '../types';

interface Props {
  open: boolean;
  members: Member[];
  onPicked: (name: string) => void;
}

export default function PickUserGate({ open, members, onPicked }: Props) {
  const [value, setValue] = useState<string | null>(null);

  return (
    <Dialog open={open} disableEscapeKeyDown maxWidth="xs" fullWidth>
      <DialogTitle>Who are you?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Pick your name so changes can be attributed in the audit log. This is
          remembered on this browser, so you only need to pick it once.
        </DialogContentText>
        <Autocomplete
          options={members.map((m) => m.name)}
          value={value}
          onChange={(_, v) => setValue(v)}
          renderInput={(params) => (
            <TextField {...params} label="Your name" autoFocus />
          )}
        />
        {members.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            (No team members yet — add yourself from the Team page first.)
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          disabled={!value}
          onClick={() => value && onPicked(value)}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
