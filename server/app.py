import os
import uuid
from typing import Optional

from .models import Players, LoginData, VerifyData

from fastapi import FastAPI, WebSocket
from starlette.responses import HTMLResponse, FileResponse
from starlette.websockets import WebSocketDisconnect


app = FastAPI()
players = Players()


# Get requests
@app.get("/")
async def get():
    return HTMLResponse(open("./public/pages/login.html").read())


@app.get("/game")
async def game():
    return HTMLResponse(open("./public/pages/game.html").read())


@app.get("/{path:path}")
async def static_files(path: str):
    if os.path.isfile(f"./public/{path}"):
        return FileResponse(f"./public/{path}")
    return HTMLResponse("nope")


# Post requests
@app.post("/login")
async def login(data: LoginData):
    if not data:
        return {"error": "no data provided"}
    if not data.username:
        return {"error": "no username provided"}
    if players.get_by_username(data.username):
        return {"error": "username already taken"}
    user_id = str(uuid.uuid4())
    players.create(user_id, data.username)
    return {"user_id": user_id}


@app.post("/verify")
async def verify(data: VerifyData):
    if not data:
        return {"error": "no data provided"}
    if not data.user_id:
        return {"error": "no user_id provided"}
    player = players.get(data.user_id)
    if player is None:
        return {"error": "invalid user_id"}
    return {"username": player["username"]}


# Websocket requests
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    user_id: Optional[str] = None
    for player in players.get_all():
        await ws.send_json({"player": player})
    try:
        while True:
            data = await ws.receive_json()
            if not data:
                continue
            if player := data.get("player"):
                if not player.get("user_id"):
                    continue
                if user_id is None:
                    user_id = player["user_id"]
                    player["ws"] = ws
                await players.update(user_id, player)
            if data.get("message"):
                await players.ws_broadcast(data)
    except WebSocketDisconnect:
        if user_id:
            await players.remove(user_id)
