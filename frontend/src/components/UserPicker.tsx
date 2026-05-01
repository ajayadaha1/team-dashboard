import { useEffect, useState } from 'react';
import { FormControl, MenuItem, Select } from '@mui/material';
import { api } from '../api';
import { useUserStore } from '../store';
import type { Member } from '../types';

export default function UserPicker() {
  const { currentUser, setCurrentUser } = useUserStore();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    api.get<Member[]>('/members').then((r) => setMembers(r.data)).catch(() => {});
  }, []);

  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <Select
        value={currentUser}
        displayEmpty
        onChange={(e) => setCurrentUser(e.target.value as string)}
      >
        <MenuItem value="">
          <em>Pick your name</em>
        </MenuItem>
        {members.map((m) => (
          <MenuItem key={m.id} value={m.name}>
            {m.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
