import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TableRowsIcon from '@mui/icons-material/TableRows';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  type GridColDef,
  type GridRowModel,
} from '@mui/x-data-grid';
import { api } from '../api';
import type { CustomColumn, Member } from '../types';
import ExportDialog from '../components/ExportDialog';
import OrgChart from '../components/OrgChart';
import ManageColumnsDialog from '../components/ManageColumnsDialog';

export default function Team() {
  const [rows, setRows] = useState<Member[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [manageColsOpen, setManageColsOpen] = useState(false);
  const [customCols, setCustomCols] = useState<CustomColumn[]>([]);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const loadCustomCols = useCallback(async () => {
    const { data } = await api.get<CustomColumn[]>('/custom-columns?table_name=team_members');
    setCustomCols(data);
  }, []);

  const load = async () => {
    const r = await api.get<Member[]>('/members', {
      params: { include_inactive: true },
    });
    setRows(r.data);
  };

  useEffect(() => {
    load();
    loadCustomCols();
  }, []);

  const memberMap = useMemo(
    () => Object.fromEntries(rows.map((m) => [m.id, m.name])),
    [rows],
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
    const { data } = await api.patch<Member>(`/members/${id}`, patch);
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
    const name = prompt('Name for new team member?');
    if (!name) return;
    const { data } = await api.post<Member>('/members', { name });
    setRows((r) => [...r, data]);
  };

  const deleteRow = async (id: number) => {
    if (!confirm('Delete this member? Their tasks/rocks/interrupts will keep an empty owner.'))
      return;
    await api.delete(`/members/${id}`);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const cols: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, editable: true, minWidth: 160 },
    { field: 'role', headerName: 'Role', flex: 1, editable: true, minWidth: 180 },
    {
      field: 'manager_id',
      headerName: 'Manager',
      width: 200,
      editable: true,
      type: 'singleSelect',
      valueOptions: [
        { value: null, label: '—' },
        ...rows.map((m) => ({ value: m.id, label: m.name })),
      ],
      valueFormatter: (p: any) =>
        p.value == null ? '—' : memberMap[p.value as number] || '—',
    },
    { field: 'location', headerName: 'Location', width: 140, editable: true },
    { field: 'email', headerName: 'Email', flex: 1, editable: true, minWidth: 200 },
    { field: 'github_handle', headerName: 'GitHub', width: 140, editable: true },
    { field: 'active', headerName: 'Active', width: 100, editable: true, type: 'boolean' },
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
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Typography variant="h4" sx={{ flexGrow: 1 }}>Team</Typography>
        <ToggleButtonGroup
          size="small"
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="chart">
            <AccountTreeIcon sx={{ mr: 1 }} fontSize="small" /> Org chart
          </ToggleButton>
          <ToggleButton value="table">
            <TableRowsIcon sx={{ mr: 1 }} fontSize="small" /> Roster
          </ToggleButton>
        </ToggleButtonGroup>
        <Button startIcon={<AddIcon />} variant="contained" onClick={addRow}>
          Add
        </Button>
        <Button startIcon={<ViewColumnIcon />} onClick={() => setManageColsOpen(true)}>
          Columns
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </Stack>

      {view === 'chart' ? (
        <OrgChart members={rows.filter((m) => m.active)} />
      ) : (
        <Box sx={{ height: 'calc(100vh - 220px)', width: '100%' }}>
          <DataGrid
            rows={gridRows}
            columns={cols}
            processRowUpdate={handleProcess}
            disableRowSelectionOnClick
            density="compact"
            slots={{ toolbar: () => <GridToolbarContainer><GridToolbarColumnsButton /></GridToolbarContainer> }}
          />
        </Box>
      )}

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        defaultTables={['team_members']}
      />
      <ManageColumnsDialog
        open={manageColsOpen}
        onClose={() => setManageColsOpen(false)}
        tableName="team_members"
        onChanged={loadCustomCols}
      />
    </Stack>
  );
}
