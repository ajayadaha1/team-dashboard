import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  type GridColDef,
  type GridRowModel,
} from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import { api } from '../api';
import { PRIORITIES, TASK_STATUSES } from '../types';
import type { BigRock, CustomColumn, Member, WeeklyTask } from '../types';
import ExportDialog from '../components/ExportDialog';
import ManageColumnsDialog from '../components/ManageColumnsDialog';
import RichTextEditor from '../components/RichTextEditor';
import { useWebSocket } from '../useWebSocket';
import { useUserStore } from '../store';

function mondayOf(d: Dayjs): Dayjs {
  const diff = (d.day() + 6) % 7; // Mon=0, Sun=6
  return d.subtract(diff, 'day').startOf('day');
}

export default function Weekly() {
  const [week, setWeek] = useState<Dayjs>(mondayOf(dayjs()));
  const [rows, setRows] = useState<WeeklyTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rocks, setRocks] = useState<BigRock[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [manageColsOpen, setManageColsOpen] = useState(false);
  const [customCols, setCustomCols] = useState<CustomColumn[]>([]);
  const [copyFromOwner, setCopyFromOwner] = useState<number | ''>('');
  const [savedRowId, setSavedRowId] = useState<number | null>(null);
  const [remoteUpdatedRowId, setRemoteUpdatedRowId] = useState<number | null>(null);
  const currentUser = useUserStore((s) => s.currentUser);
  const [noteContent, setNoteContent] = useState('');
  const [remoteNoteContent, setRemoteNoteContent] = useState<string | undefined>(undefined);
  const [remoteNoteVersion, setRemoteNoteVersion] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const weekRef = useRef<string>('');

  const weekIso = week.format('YYYY-MM-DD');
  weekRef.current = weekIso;

  // --- WebSocket: live updates for tasks and notes ---
  useWebSocket(
    useCallback((msg) => {
      const sender = msg.sender as string | undefined;
      const isRemote = sender && sender !== useUserStore.getState().currentUser;
      if (msg.type === 'task_created') {
        const task = msg.task as WeeklyTask;
        if (task.week_start === weekRef.current) {
          setRows((prev) => {
            if (prev.some((r) => r.id === task.id)) return prev;
            return [task, ...prev];
          });
          if (isRemote) {
            setRemoteUpdatedRowId(task.id);
            setTimeout(() => setRemoteUpdatedRowId(null), 1500);
          }
        }
      } else if (msg.type === 'task_updated') {
        const task = msg.task as WeeklyTask;
        setRows((prev) => prev.map((r) => (r.id === task.id ? task : r)));
        if (isRemote) {
          setRemoteUpdatedRowId(task.id);
          setTimeout(() => setRemoteUpdatedRowId(null), 1500);
        }
      } else if (msg.type === 'task_deleted') {
        const id = msg.task_id as number;
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else if (msg.type === 'weekly_note_update') {
        if ((msg.week_start as string) === weekRef.current) {
          setRemoteNoteContent(msg.content as string);
          setRemoteNoteVersion((v) => v + 1);
        }
      } else if (msg.type === 'rock_created') {
        const rock = msg.rock as BigRock;
        setRocks((prev) => (prev.some((r) => r.id === rock.id) ? prev : [rock, ...prev]));
      } else if (msg.type === 'rock_updated') {
        const rock = msg.rock as BigRock;
        setRocks((prev) => prev.map((r) => (r.id === rock.id ? rock : r)));
      } else if (msg.type === 'rock_deleted') {
        const id = msg.rock_id as number;
        setRocks((prev) => prev.filter((r) => r.id !== id));
      }
    }, []),
  );

  const loadCustomCols = useCallback(async () => {
    const { data } = await api.get<CustomColumn[]>('/custom-columns?table_name=weekly_tasks');
    setCustomCols(data);
  }, []);

  const load = async () => {
    const r = await api.get<WeeklyTask[]>('/weekly-tasks', {
      params: { week_start: weekIso },
    });
    setRows(r.data);
  };

  const loadNote = async () => {
    const { data } = await api.get<{ content: string }>('/weekly-notes', {
      params: { week_start: weekIso },
    });
    setNoteContent(data.content);
    setRemoteNoteContent(undefined);
  };

  useEffect(() => {
    api.get<Member[]>('/members').then((r) => setMembers(r.data));
    api.get<BigRock[]>('/big-rocks').then((r) => setRocks(r.data));
    loadCustomCols();
  }, []);

  useEffect(() => {
    load();
    loadNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekIso]);

  const handleNoteUpdate = useCallback(
    (html: string) => {
      setNoteContent(html);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await api.put('/weekly-notes', {
          week_start: weekRef.current,
          content: html,
        });
      }, 600);
    },
    [],
  );

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members],
  );
  const rockMap = useMemo(
    () => Object.fromEntries(rocks.map((r) => [r.id, r.title])),
    [rocks],
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
    const { data } = await api.patch<WeeklyTask>(`/weekly-tasks/${id}`, patch);
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
    const { data } = await api.post<WeeklyTask>('/weekly-tasks', {
      title: 'New task',
      week_start: weekIso,
      priority: 'P2',
      status: 'Planned',
    });
    setRows((r) => r.some((x) => x.id === data.id) ? r : [data, ...r]);
  };

  const deleteRow = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/weekly-tasks/${id}`);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const copyLastWeek = async () => {
    if (!copyFromOwner) return;
    const from = week.subtract(7, 'day').format('YYYY-MM-DD');
    await api.post('/weekly-tasks/copy-week', {
      owner_id: copyFromOwner,
      from_week: from,
      to_week: weekIso,
    });
    await load();
  };

  const cols: GridColDef[] = [
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
      field: 'priority',
      headerName: 'Pri',
      width: 80,
      editable: true,
      type: 'singleSelect',
      valueOptions: PRIORITIES as unknown as string[],
    },
    { field: 'title', headerName: 'Title', flex: 2, editable: true, minWidth: 240 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      editable: true,
      type: 'singleSelect',
      valueOptions: TASK_STATUSES as unknown as string[],
    },
    {
      field: 'big_rock_id',
      headerName: 'Big Rock',
      width: 200,
      editable: true,
      type: 'singleSelect',
      valueOptions: [
        { value: null, label: '—' },
        ...rocks.map((r) => ({ value: r.id, label: r.title })),
      ],
      valueFormatter: (p: any) =>
        p.value == null ? '—' : rockMap[p.value as number] || '—',
    },
    { field: 'notes', headerName: 'Notes', flex: 1, editable: true, minWidth: 200 },
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
        <Typography variant="h4" sx={{ flexGrow: 1 }}>Weekly Tasks</Typography>
        <DatePicker
          label="Week of (Monday)"
          value={week}
          onChange={(v) => v && setWeek(mondayOf(v))}
          slotProps={{ textField: { size: 'small' } }}
        />
        <Select
          size="small"
          displayEmpty
          value={copyFromOwner}
          onChange={(e) => setCopyFromOwner(e.target.value as any)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value=""><em>Copy last week for…</em></MenuItem>
          {members.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
          ))}
        </Select>
        <Button
          startIcon={<ContentCopyIcon />}
          disabled={!copyFromOwner}
          onClick={copyLastWeek}
        >
          Copy
        </Button>
        <Button startIcon={<AddIcon />} variant="contained" onClick={addRow}>
          New task
        </Button>
        <Button startIcon={<ViewColumnIcon />} onClick={() => setManageColsOpen(true)}>
          Columns
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </Stack>

      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={gridRows}
          columns={cols}
          processRowUpdate={handleProcess}
          disableRowSelectionOnClick
          density="compact"
          initialState={{ sorting: { sortModel: [{ field: 'owner_id', sort: 'asc' }] } }}
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

      <Typography variant="h6" sx={{ mt: 1 }}>Weekly Notes</Typography>
      <RichTextEditor
        key={weekIso}
        content={noteContent}
        onUpdate={handleNoteUpdate}
        remoteContent={remoteNoteContent}
        remoteVersion={remoteNoteVersion}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        defaultTables={['weekly_tasks']}
      />
      <ManageColumnsDialog
        open={manageColsOpen}
        onClose={() => setManageColsOpen(false)}
        tableName="weekly_tasks"
        onChanged={loadCustomCols}
      />
    </Stack>
  );
}
