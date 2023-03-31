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

    async def update(self, username: str, data) -> None:
        """
        Update (or create) a player's data and broadcast the update
        :param username: The username of the player to update as a string
        :param data: The data to update the player with as a dict
        """
        if self.__players.get(username) is None:
            self.__players[username] = {
                **DEFAULT_VALUES,
                **data,
                "username": username,
            }
        else:
            self.__players[username].update(data)
        await self.ws_broadcast({"player": self.get(username)})

    def get(self, username: str) -> Player:
        """
        Get a player by username (the websocket is removed)
        :param username: The username of the player to get as a string
        :return: The player as a dict
        """
        player = self.__players.get(username).copy()
        if player is None:
            return {"username": username, "alive": False}
        del player["ws"]
        return player

    def get_all(self) -> Iterable[Player]:
        """
        Get all players
        :return: A generator of players as a generator of dicts
        """
        for username in self.__players:
            yield self.get(username)

    async def remove(self, username) -> None:
        """
        Remove a player from the list and broadcast the removal
        :param username: The username of the player to remove as a string
        """
        del self.__players[username]
        await self.ws_broadcast({"player": {"username": username, "alive": False}})

    async def ws_broadcast(self, message: Union[str, dict]):
        """
        Broadcast a message to all players
        :param message: The message to broadcast as a string or dict. If a dict,
            it will be converted to JSON.
        """
        if isinstance(message, dict):
            for player in self.__players.values():
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
        await ws.send_json({"player": player})
    try:
        while True:
            data = await ws.receive_json()
            if not data:
                continue
            if data.get("player"):
                player = data["player"]
                if not player.get("username"):
                    continue
                if not connected:
                    username = player["username"]
                    player["ws"] = ws
                    connected = True
                await players.update(username, player)
    except WebSocketDisconnect:
        if username:
            await players.remove(username)
