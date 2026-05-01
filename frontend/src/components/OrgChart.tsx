import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Member } from '../types';
import MemberProfileDrawer from './MemberProfileDrawer';

interface Props {
  members: Member[];
}

function initials(name: string): string {
  const parts = name.replace(',', '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const palette = [
    '#5b8ff9', '#5ad8a6', '#5d7092', '#f6bd16', '#e8684a',
    '#6dc8ec', '#9270ca', '#ff9d4d', '#269a99', '#ff99c3',
  ];
  return palette[h % palette.length];
}

function lastNameFirst(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts.pop()!;
  return `${last}, ${parts.join(' ')}`;
}

interface PersonCardProps {
  member: Member;
  childCount: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onOpenProfile: (m: Member) => void;
  size?: 'lg' | 'md' | 'sm';
}

function PersonCard({
  member,
  childCount,
  expanded,
  onToggleExpand,
  onOpenProfile,
  size = 'md',
}: PersonCardProps) {
  const av = size === 'lg' ? 56 : size === 'md' ? 48 : 40;
  return (
    <Card
      onClick={() => onOpenProfile(member)}
      variant="outlined"
      sx={{
        cursor: 'pointer',
        bgcolor: 'background.paper',
        borderColor: 'rgba(255,255,255,0.08)',
        transition: 'border-color 120ms, transform 120ms',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-1px)',
        },
        minWidth: 280,
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ position: 'relative' }}>
            <Avatar
              sx={{
                bgcolor: colorFor(member.name),
                width: av,
                height: av,
                fontSize: av * 0.4,
                fontWeight: 700,
              }}
            >
              {initials(member.name)}
            </Avatar>
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                bottom: 2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: member.active ? '#27c93f' : '#ff5f57',
                border: '2px solid',
                borderColor: 'background.paper',
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant={size === 'lg' ? 'h6' : 'subtitle1'}
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
              noWrap
            >
              {lastNameFirst(member.name)}
            </Typography>
            {member.role && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: 'block' }}
                noWrap
              >
                {member.role}
              </Typography>
            )}
            {member.location && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
                noWrap
              >
                {member.location}
              </Typography>
            )}
          </Box>

          {childCount > 0 && (
            <Chip
              icon={<GroupsIcon sx={{ fontSize: 16 }} />}
              label={childCount}
              size="small"
              variant="outlined"
              title={`${childCount} direct report${childCount === 1 ? '' : 's'}`}
            />
          )}

          {childCount > 0 && onToggleExpand && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function OrgChart({ members }: Props) {
  const [drawerMember, setDrawerMember] = useState<Member | null>(null);

  const childCount = useMemo(() => {
    const m = new Map<number, number>();
    members.forEach((x) => {
      if (x.manager_id != null) m.set(x.manager_id, (m.get(x.manager_id) ?? 0) + 1);
    });
    return m;
  }, [members]);

  const idSet = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const roots = useMemo(
    () => members.filter((m) => m.manager_id == null || !idSet.has(m.manager_id)),
    [members, idSet],
  );

  // Default: expand every node that has children (i.e. show full tree).
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Recompute defaults whenever members load/change. Only runs while the user
  // hasn't manually toggled anything (tracked via `touched`).
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched) return;
    const s = new Set<number>();
    members.forEach((m) => {
      if ((childCount.get(m.id) ?? 0) > 0) s.add(m.id);
    });
    setExpanded(s);
  }, [members, childCount, touched]);

  const toggle = (id: number) => {
    setTouched(true);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Manual position swaps (key = name shown by API, value = sort-as name).
  const SORT_OVERRIDES: Record<string, string> = {
    'Calvin Charles': 'Syed Islam',
    'Syed Islam': 'Calvin Charles',
  };
  const sortKey = (m: Member) => SORT_OVERRIDES[m.name] ?? m.name;

  const directsOf = (id: number) =>
    members
      .filter((m) => m.manager_id === id)
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  if (members.length === 0) {
    return <Typography color="text.secondary">No team members yet.</Typography>;
  }

  return (
    <>
      <Stack spacing={3} alignItems="center" sx={{ pt: 2, width: '100%' }}>
        {roots.map((root) => (
          <RootSubtree
            key={root.id}
            root={root}
            childCount={childCount}
            directsOf={directsOf}
            expanded={expanded}
            onToggle={toggle}
            onOpenProfile={setDrawerMember}
          />
        ))}
      </Stack>

      <MemberProfileDrawer
        member={drawerMember}
        onClose={() => setDrawerMember(null)}
      />
    </>
  );
}

interface SubtreeProps {
  root: Member;
  childCount: Map<number, number>;
  directsOf: (id: number) => Member[];
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onOpenProfile: (m: Member) => void;
}

function RootSubtree({
  root,
  childCount,
  directsOf,
  expanded,
  onToggle,
  onOpenProfile,
}: SubtreeProps) {
  const directs = directsOf(root.id);
  const isExpanded = expanded.has(root.id);

  return (
    <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
      {/* Root card */}
      <Box>
        <PersonCard
          member={root}
          childCount={childCount.get(root.id) ?? 0}
          expanded={isExpanded}
          onToggleExpand={() => onToggle(root.id)}
          onOpenProfile={onOpenProfile}
          size="lg"
        />
      </Box>

      {isExpanded && directs.length > 0 && (
        <>
          <Box sx={{ width: 2, height: 16, bgcolor: 'rgba(255,255,255,0.12)' }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 2,
              width: '100%',
              maxWidth: 1400,
              alignItems: 'start',
            }}
          >
            {directs.map((d) => (
              <DirectColumn
                key={d.id}
                member={d}
                childCount={childCount}
                directsOf={directsOf}
                expanded={expanded}
                onToggle={onToggle}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </Box>
        </>
      )}
    </Stack>
  );
}

function DirectColumn({
  member,
  childCount,
  directsOf,
  expanded,
  onToggle,
  onOpenProfile,
}: {
  member: Member;
  childCount: Map<number, number>;
  directsOf: (id: number) => Member[];
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onOpenProfile: (m: Member) => void;
}) {
  const directs = directsOf(member.id);
  const has = directs.length > 0;
  const isExpanded = expanded.has(member.id);

  return (
    <Stack spacing={1} alignItems="stretch">
      <PersonCard
        member={member}
        childCount={childCount.get(member.id) ?? 0}
        expanded={isExpanded}
        onToggleExpand={has ? () => onToggle(member.id) : undefined}
        onOpenProfile={onOpenProfile}
      />

      {has && isExpanded && (
        <Stack
          spacing={1}
          sx={{
            ml: 3,
            pl: 2,
            borderLeft: '2px solid rgba(255,255,255,0.08)',
            mt: 1,
          }}
        >
          {directs.map((d) => (
            <DirectColumn
              key={d.id}
              member={d}
              childCount={childCount}
              directsOf={directsOf}
              expanded={expanded}
              onToggle={onToggle}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
