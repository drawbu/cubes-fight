import os
from typing import Dict

from fastapi import FastAPI, WebSocket
from starlette.responses import HTMLResponse, FileResponse
from starlette.websockets import WebSocketDisconnect

app = FastAPI()
players: Dict[str, dict] = {}
change_list = []
DEFAULT_VALUES = {"x": 300, "y": 300, "angle": 0, "alive": True}


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
    await ws.accept()
    username = ""
    connected = False
    for player in players.values():
        await ws.send_json(player)
    i = len(change_list)
    try:
        while True:
            while i < len(change_list):
                user_change = change_list[i]
                i += 1
                if user_change == username:
                    continue
                if user_change not in players:
                    await ws.send_json({"username": user_change, "alive": False})
                    continue
                await ws.send_json(players[user_change])

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
            change_list.append(username)
            i += 1
    except WebSocketDisconnect:
        if username:
            del players[username]
            change_list.append(username)
