import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  type GridColDef,
  type GridRowModel,
} from '@mui/x-data-grid';
import { api } from '../api';
import { INTERRUPT_STATUSES, SEVERITIES } from '../types';
import type { CustomColumn, Interrupt, Member } from '../types';
import ExportDialog from '../components/ExportDialog';
import ManageColumnsDialog from '../components/ManageColumnsDialog';
import { useWebSocket } from '../useWebSocket';
import { useUserStore } from '../store';

export default function Interrupts() {
  const [rows, setRows] = useState<Interrupt[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [manageColsOpen, setManageColsOpen] = useState(false);
  const [customCols, setCustomCols] = useState<CustomColumn[]>([]);
  const [savedRowId, setSavedRowId] = useState<number | null>(null);
  const [remoteUpdatedRowId, setRemoteUpdatedRowId] = useState<number | null>(null);

  // --- WebSocket: live updates for interrupts ---
  useWebSocket(
    useCallback((msg) => {
      const sender = msg.sender as string | undefined;
      const isRemote = sender && sender !== useUserStore.getState().currentUser;
      if (msg.type === 'interrupt_created') {
        const item = msg.interrupt as Interrupt;
        setRows((prev) => {
          if (prev.some((r) => r.id === item.id)) return prev;
          return [item, ...prev];
        });
        if (isRemote) {
          setRemoteUpdatedRowId(item.id);
          setTimeout(() => setRemoteUpdatedRowId(null), 1500);
        }
      } else if (msg.type === 'interrupt_updated') {
        const item = msg.interrupt as Interrupt;
        setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)));
        if (isRemote) {
          setRemoteUpdatedRowId(item.id);
          setTimeout(() => setRemoteUpdatedRowId(null), 1500);
        }
      } else if (msg.type === 'interrupt_deleted') {
        const id = msg.interrupt_id as number;
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    }, []),
  );

  const loadCustomCols = useCallback(async () => {
    const { data } = await api.get<CustomColumn[]>('/custom-columns?table_name=customer_interrupts');
    setCustomCols(data);
  }, []);

  const load = async () => {
    const r = await api.get<Interrupt[]>('/interrupts');
    setRows(r.data);
  };

  useEffect(() => {
    api.get<Member[]>('/members').then((r) => setMembers(r.data));
    load();
    loadCustomCols();
  }, []);

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members],
  );

  const handleProcess = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    const id = newRow.id as number;
    const patch: any = {};
    const customFieldKeys = new Set(customCols.map((c) => `cf_${c.column_name}`));
    const newCustom: Record<string, unknown> = { ...(oldRow.custom_fields ?? {}) };
    let customChanged = false;
    for (const k of Object.keys(newRow)) {
      if (customFieldKeys.has(k)) {
        const realKey = k.slice(3);
        if (newRow[k] !== oldRow[k]) { newCustom[realKey] = newRow[k]; customChanged = true; }
      } else if (k !== 'custom_fields' && newRow[k] !== oldRow[k]) {
        patch[k] = newRow[k];
      }
    }
    if (customChanged) patch.custom_fields = newCustom;
    if (Object.keys(patch).length === 0) return oldRow;
    const { data } = await api.patch<Interrupt>(`/interrupts/${id}`, patch);
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
    setSavedRowId(id);
    setTimeout(() => setSavedRowId(null), 1200);
    return { ...newRow, ...data, ...flattenCustom(data.custom_fields) };
  };

  const flattenCustom = (cf: Record<string, unknown> | undefined) => {
    const flat: Record<string, unknown> = {};
    if (cf) for (const [k, v] of Object.entries(cf)) flat[`cf_${k}`] = v;
    return flat;
  };

  const gridRows = useMemo(
    () => rows.map((r) => ({ ...r, ...flattenCustom(r.custom_fields) })),
    [rows, customCols],
  );

  const addRow = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await api.post<Interrupt>('/interrupts', {
      customer: 'New customer',
      title: 'New interrupt',
      severity: 'Sev3',
      status: 'Open',
      reported_date: today,
    });
    setRows((r) => r.some((x) => x.id === data.id) ? r : [data, ...r]);
  };

  const deleteRow = async (id: number) => {
    if (!confirm('Delete this interrupt?')) return;
    await api.delete(`/interrupts/${id}`);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const cols: GridColDef[] = [
    { field: 'customer', headerName: 'Customer', width: 140, editable: true },
    {
      field: 'severity',
      headerName: 'Sev',
      width: 90,
      editable: true,
      type: 'singleSelect',
      valueOptions: SEVERITIES as unknown as string[],
    },
    { field: 'title', headerName: 'Title', flex: 2, editable: true, minWidth: 220 },
    {
      field: 'owner_id',
      headerName: 'Owner',
      width: 150,
      editable: true,
      type: 'singleSelect',
      valueOptions: [
        { value: null, label: '—' },
        ...members.map((m) => ({ value: m.id, label: m.name })),
      ],
      valueFormatter: (p: any) =>
        p.value == null ? '—' : memberMap[p.value as number] || '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      editable: true,
      type: 'singleSelect',
      valueOptions: INTERRUPT_STATUSES as unknown as string[],
    },
    {
      field: 'reported_date',
      headerName: 'Reported',
      width: 120,
      editable: true,
      type: 'date',
      valueGetter: (p: any) => (p.value ? new Date(p.value as string) : null),
      valueSetter: (p: any) => ({
        ...p.row,
        reported_date: p.value ? (p.value as Date).toISOString().slice(0, 10) : null,
      }),
    },
    {
      field: 'resolved_date',
      headerName: 'Resolved',
      width: 120,
      editable: true,
      type: 'date',
      valueGetter: (p: any) => (p.value ? new Date(p.value as string) : null),
      valueSetter: (p: any) => ({
        ...p.row,
        resolved_date: p.value ? (p.value as Date).toISOString().slice(0, 10) : null,
      }),
    },
    {
      field: 'hours_spent',
      headerName: 'Hrs',
      width: 80,
      editable: true,
      type: 'number',
    },
    { field: 'jira_link', headerName: 'Jira', flex: 1, editable: true, minWidth: 180 },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      editable: true,
      minWidth: 220,
    },
    ...customCols.map((cc) => ({
      field: `cf_${cc.column_name}`,
      headerName: cc.column_name,
      width: 150,
      editable: true,
      type: cc.column_type === 'number' ? 'number' as const : cc.column_type === 'boolean' ? 'boolean' as const : undefined,
    })),
    {
      field: 'actions',
      type: 'actions',
      width: 60,
      getActions: (p) => [
        <GridActionsCellItem
          key="del"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => deleteRow(p.id as number)}
        />,
      ],
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h4" sx={{ flexGrow: 1 }}>Customer Interrupts</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={addRow}>
          New
        </Button>
        <Button startIcon={<ViewColumnIcon />} onClick={() => setManageColsOpen(true)}>
          Columns
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </Stack>

      <Box sx={{ height: 'calc(100vh - 220px)', width: '100%' }}>
        <DataGrid
          rows={gridRows}
          columns={cols}
          processRowUpdate={handleProcess}
          disableRowSelectionOnClick
          density="compact"
          slots={{ toolbar: () => <GridToolbarContainer><GridToolbarColumnsButton /></GridToolbarContainer> }}
          getRowClassName={(params) =>
            params.id === savedRowId ? 'row-saved' : params.id === remoteUpdatedRowId ? 'row-remote-update' : ''
          }
          sx={{
            '@keyframes flashSave': {
              '0%': { backgroundColor: 'rgba(76,175,80,0.35)' },
              '100%': { backgroundColor: 'transparent' },
            },
            '@keyframes flashRemote': {
              '0%': { backgroundColor: 'rgba(33,150,243,0.35)' },
              '100%': { backgroundColor: 'transparent' },
            },
            '& .row-saved': {
              animation: 'flashSave 1.2s ease-out',
            },
            '& .row-remote-update': {
              animation: 'flashRemote 1.5s ease-out',
            },
          }}
        />
      </Box>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        defaultTables={['customer_interrupts']}
      />
      <ManageColumnsDialog
        open={manageColsOpen}
        onClose={() => setManageColsOpen(false)}
        tableName="customer_interrupts"
        onChanged={loadCustomCols}
      />
    </Stack>
  );
}
