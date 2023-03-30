import json
from typing import Dict

from flask import Flask, send_from_directory, request
from simple_websocket import Server, ConnectionClosed, ConnectionError


app = Flask(__name__)
players: Dict[str, dict] = {}
change_list = []
DEFAULT_VALUES = {"x": 300, "y": 300, "angle": 0, "alive": True}


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


@app.route('/echo', websocket=True)
def echo():
    ws = Server(request.environ)
    username = ""
    try:
        connected = False
        for player in players.values():
            ws.send(json.dumps(player))
        i = len(change_list)
        while True:
            if i < len(change_list):
                user_change = change_list[i]
                i += 1
                if user_change == username:
                    continue
                if user_change not in players:
                    ws.send(json.dumps({
                        "username": user_change,
                        "alive": False
                    }))
                    continue
                ws.send(json.dumps(players[user_change]))

            raw_data = ws.receive()
            if not raw_data:
                continue
            data = json.loads(raw_data)
            if not data.get('username'):
                continue
            if not connected:
                username = data["username"]
                print(
                    "New player - "
                    f"ip=\"{request.remote_addr}\" - "
                    f"username=\"{username}\""
                )
                connected = True

            if players.get(username) is None:
                players[username] = {**DEFAULT_VALUES, **data}
            else:
                players[username].update(data)
            change_list.append(username)
            i += 1
    except ConnectionClosed:
        pass
    except ConnectionError:
        pass
    if username:
        del players[username]
        change_list.append(username)
        print(f"Player \"{username}\" disconnected")
    request.close()
    return ""


if __name__ == "__main__":
    app.run(host="localhost", port=8080)
