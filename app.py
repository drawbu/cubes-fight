import os
import uuid
from typing import Dict, Union, TypedDict, Iterable, Optional

from pydantic import BaseModel
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


class MovementData(TypedDict, total=False):
    user_id: Required[str]
    x: int
    y: int
    angle: int
    ws: WebSocket


class Players:
    def __init__(self):
        self.__players: Dict[str, Player] = {}

    def create(self, user_id: str, username: str) -> None:
        """
        Create a player and add them to the list
        :param user_id: The user ID of the player to create as a string
        :param username: The username of the player to create as a string
        """
        self.__players[user_id] = {
            "username": username,
        }

    async def update(self, user_id: str, data: MovementData) -> bool:
        """
        Update (or create) a player's data and broadcast the update
        :param user_id: The uuid of the player to update as a string
        :param data: The data to update the player with as a dict
        """
        if self.__players.get(user_id) is None:
            return False
        player = self.__players[user_id]
        if data.get("x") is not None:
            player["x"] = data["x"]
        if data.get("y") is not None:
            player["y"] = data["y"]
        if data.get("angle") is not None:
            player["angle"] = data["angle"]
        if data.get("ws") is not None:
            player["ws"] = data["ws"]
        await self.ws_broadcast({"player": self.get(user_id)})
        return True

    def get(self, user_id: str) -> Optional[Player]:
        """
        Get a player by username (the websocket is removed)
        :param user_id: The uuid of the player to get as a string
        :return: The player as a dict
        """
        if self.__players.get(user_id) is None:
            return None
        player = self.__players[user_id].copy()
        if player.get("ws") is not None:
            del player["ws"]
        return player

    def get_all(self) -> Iterable[Player]:
        """
        Get all players
        :return: A generator of players as a generator of dicts
        """
        for user_id in self.__players:
            yield self.get(user_id)

    async def remove(self, user_id: str) -> None:
        """
        Remove a player from the list and broadcast the removal
        :param user_id: The uuid of the player to remove as a string
        """
        del self.__players[user_id]
        await self.ws_broadcast({"player": {"user_id": user_id, "alive": False}})

    async def ws_broadcast(self, message: Union[str, dict]):
        """
        Broadcast a message to all players
        :param message: The message to broadcast as a string or dict. If a dict,
            it will be converted to JSON.
        """
        if isinstance(message, dict):
            for player in self.__players.values():
                if (ws := player.get("ws")) is None:
                    print(player)
                    continue
                await ws.send_json(message)
            return
        for player in self.__players.values():
            if (ws := player.get("ws")) is None:
                continue
            await ws.send_text(message)


players = Players()


# Get requests
@app.get("/")
async def get():
    return HTMLResponse(open("public/pages/index.html").read())


@app.get("/game")
async def game():
    return HTMLResponse(open("public/pages/game.html").read())


@app.get("/{path:path}")
async def static_files(path: str):
    if os.path.isfile(f"public/{path}"):
        return FileResponse(f"public/{path}")
    return HTMLResponse("nope")


# Post requests
class Login(BaseModel):
    username: str


@app.post("/login")
async def login(data: Login):
    if not data:
        return {"error": "no data provided"}
    if not data.username:
        return {"error": "no username provided"}
    user_id = str(uuid.uuid4())
    players.create(user_id, data.username)
    return {"user_id": user_id}


class Verify(BaseModel):
    user_id: str


@app.post("/verify")
async def verify(data: Verify):
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
