import json
from typing import Dict

from flask import Flask, send_from_directory
from flask_sock import Sock


app = Flask(__name__)
sock = Sock(app)
players: Dict[str, dict] = {}
change_list = []
DEFAULT_VALUES = {"x": 300, "y": 300, "angle": 0}


# Path for our main page
@app.route("/")
def home():
    return send_from_directory("public", "index.html")


# Path for all the static files (compiled JS/CSS, etc.)
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)


@app.errorhandler(404)
def page_not_found(e):
    return "Page not found :/", 404


@sock.route("/echo")
def echo(ws):
    for player in players.values():
        ws.send(json.dumps(player))
    i = len(change_list)
    while True:
        if raw_data := ws.receive():
            data = json.loads(raw_data)

            if players.get(data["username"]) is None:
                players[data["username"]] = {**DEFAULT_VALUES, **data}
            else:
                players[data["username"]].update(data)
            change_list.append(data["username"])
            i += 1
        if i < len(change_list):
            ws.send(json.dumps(players[change_list[i]]))
            i += 1


if __name__ == "__main__":
    app.run(host="localhost", port=8080)
