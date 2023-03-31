import os
from typing import Dict, Union, TypedDict, Iterable
from typing_extensions import Required

from fastapi import FastAPI, WebSocket
from starlette.responses import HTMLResponse, FileResponse
from starlette.websockets import WebSocketDisconnect


app = FastAPI()


class Player(TypedDict, total=False):
    username: Required[str]
    x: int
    y: int
    angle: int
    alive: bool
    ws: WebSocket


DEFAULT_VALUES: Player = {
    "x": 300,
    "y": 300,
    "angle": 0,
    "alive": True,
    "username": "",
}


class Players:
    def __init__(self):
        self.__players: Dict[str, Player] = {}

    def update(self, username: str, data) -> None:
        if self.__players.get(username) is None:
            self.__players[username] = {
                **DEFAULT_VALUES,
                **data,
                "username": username,
            }
        else:
            self.__players[username].update(data)
        self.ws_broadcast(self.get(username))

    def get(self, username: str) -> Player:
        player = self.__players.get(username).copy()
        if player is None:
            return {"username": username, "alive": False}
        del player["ws"]
        return player

    def get_all(self) -> Iterable[Player]:
        for username in self.__players:
            yield self.get(username)

    def remove(self, username) -> None:
        del self.__players[username]
        self.ws_broadcast({"username": username, "alive": False})

    async def ws_broadcast(self, message: Union[str, dict]):
        if isinstance(message, dict):
            for player in self.__players.values():
                print(player)
                await player["ws"].send_json(message)
            return
        for player in self.__players.values():
            await player["ws"].send_text(message)


players = Players()


@app.get("/")
async def get():
    return HTMLResponse(open("public/index.html").read())


@app.get("/{path:path}")
async def static_files(path: str):
    if os.path.isfile(f"public/{path}"):
        return FileResponse(f"public/{path}")
    return HTMLResponse("nope")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    username = ""
    connected = False
    for player in players.get_all():
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
                data["ws"] = ws
                connected = True
            players.update(username, data)
    except WebSocketDisconnect:
        if username:
            players.remove(username)
