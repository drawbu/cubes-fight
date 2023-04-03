from typing import Dict, Union, TypedDict, Iterable, Optional, Tuple
from typing_extensions import Required

from fastapi import WebSocket


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
        await self.ws_broadcast({"player": self.get(user_id)}, (user_id,))
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
        username = self.__players[user_id]["username"]
        del self.__players[user_id]
        await self.ws_broadcast({"player": {"username": username, "alive": False}})

    async def ws_broadcast(
        self,
        message: Union[str, dict],
        exclude: Optional[Tuple[str]] = None
    ) -> None:
        """
        Broadcast a message to all players
        :param message: The message to broadcast as a string or dict. If a dict,
            it will be converted to JSON.
        :param exclude: A tuple of user IDs to exclude from the broadcast
        """
        if isinstance(message, dict):
            for user_id, player in self.__players.items():
                if (ws := player.get("ws")) is None:
                    continue
                if exclude is not None and user_id in exclude:
                    continue
                await ws.send_json(message)
            return
        for user_id, player in self.__players.items():
            if (ws := player.get("ws")) is None:
                continue
            if exclude is not None and user_id in exclude:
                continue
            await ws.send_text(message)
