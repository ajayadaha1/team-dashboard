"""WebSocket connection manager for real-time broadcasting."""

import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps WebSocket -> user_name
        self.active_connections: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_name: str = ""):
        await websocket.accept()
        self.active_connections[websocket] = user_name
        await self._broadcast_presence()

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)
        await self._broadcast_presence()

    def get_active_users(self) -> list[str]:
        """Return deduplicated list of connected user names."""
        names = set(n for n in self.active_connections.values() if n)
        return sorted(names)

    async def _broadcast_presence(self):
        """Notify all clients about current active users."""
        await self.broadcast({
            "type": "presence",
            "users": self.get_active_users(),
        })

    async def broadcast(self, message: dict[str, Any]):
        """Send message to all connected clients."""
        data = json.dumps(message, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.active_connections.pop(conn, None)


manager = ConnectionManager()
