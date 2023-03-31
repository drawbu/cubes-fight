import os
from typing import Dict, Union

from fastapi import FastAPI, WebSocket
from starlette.responses import HTMLResponse, FileResponse
from starlette.websockets import WebSocketDisconnect

app = FastAPI()
players: Dict[str, dict] = {}
DEFAULT_VALUES = {"x": 300, "y": 300, "angle": 0, "alive": True}


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active_connections.remove(ws)

    async def broadcast(self, message: Union[str, dict]):
        if isinstance(message, dict):
            for connection in self.active_connections:
                await connection.send_json(message)
            return
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.get("/")
async def get():
    return HTMLResponse(open("public/index.html").read())


@app.get("/{path:path}")
async def static_files(path: str):
    if os.path.isfile(f"public/{path}"):
        return FileResponse(f"public/{path}")
    return HTMLResponse("nope")


@app.websocket("/echo")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    username = ""
    connected = False
    for player in players.values():
        await ws.send_json(player)
    try:
        while True:
            data = await ws.receive_json()
            if not data:
                continue
            if not data.get('username'):
                continue
            if not connected:
                username = data["username"]
                connected = True

            if players.get(username) is None:
                players[username] = {**DEFAULT_VALUES, **data}
            else:
                players[username].update(data)
            await manager.broadcast(players[username])
    except WebSocketDisconnect:
        manager.disconnect(ws)
        if username:
            del players[username]
            await manager.broadcast({"username": username, "alive": False})
