import json
from typing import Dict

from flask import Flask, send_from_directory, request, jsonify

app = Flask(__name__)
players: Dict[str, dict] = {}
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


@app.route('/update-player', methods=['POST'])
def upload_files():
    data = json.loads(request.data)
    username = data["username"]
    del data["username"]

    if players.get(username) is None:
        players[username] = {**DEFAULT_VALUES, **data}
    else:
        players[username].update(data)

    return jsonify(players)


if __name__ == "__main__":
    app.run(host="localhost", port=8080)
