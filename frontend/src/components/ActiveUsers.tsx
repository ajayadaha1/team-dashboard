import { Avatar, AvatarGroup, Tooltip } from '@mui/material';

// Deterministic color from a string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

interface ActiveUsersProps {
  users: string[];
}

export default function ActiveUsers({ users }: ActiveUsersProps) {
  if (users.length === 0) return null;

  return (
    <AvatarGroup
      max={6}
      sx={{
        '& .MuiAvatar-root': {
          width: 32,
          height: 32,
          fontSize: '0.8rem',
          fontWeight: 600,
          border: '2px solid',
          borderColor: 'background.paper',
          cursor: 'default',
        },
      }}
    >
      {users.map((name) => (
        <Tooltip key={name} title={name} arrow placement="bottom">
          <Avatar
            sx={{
              bgcolor: stringToColor(name),
              color: '#fff',
            }}
          >
            {getInitials(name)}
          </Avatar>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
}
