import { Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ExportDialog from '../components/ExportDialog';

export default function Export() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    // Go back if there's history; otherwise land on Home.
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Export</Typography>
      <Typography color="text.secondary">
        Pick tables and a format. Multi-table downloads come as one .xlsx workbook
        with one sheet per table.
      </Typography>
      <ExportDialog open={open} onClose={handleClose} />
    </Stack>
  );
}
