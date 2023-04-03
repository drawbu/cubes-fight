// Get the user_id from the local storage
const user_id = localStorage.getItem('user_id');
let socket;
let connected = false;
let username;
const chat = document.getElementById('chat');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
let started = false;
const players = {};


// Verify the user_id
fetch('/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: user_id }),
})
  .then((res) => (res.status === 200) ? res.json() : null)
  .then((data) => {
    if (!data || !data['username']) {
      window.location.href = '/';
      return;
    }
    username = data['username'];
  });


// Wait for the username to be set
const onUsernameSet = setInterval(() => {
  if (!username) {
    return;
  }
  const player = createPlayer(username, {x: 300, y: 300, angle: 0});
  player.element.id = 'player'
  player.lastAngle = 0;

  const websocketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(websocketProtocol + '//' + location.host + '/ws')
  socket.onopen = onSocketOpen;
  socket.onclose = onSocketClose;
  socket.onmessage = onSocketMessage;
  window.onmousemove = onMouseMove;
  window.onmouseup = onMouseClick;
  window.onkeydown = onKeyDown;
  chat.onsubmit = onChatSubmit;

  started = true;
  clearInterval(onUsernameSet);
});

function getCenterCoordinates(element) {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
}


// Events
onMouseMove = (event) => {
  const player = players[username];
  const center = getCenterCoordinates(player.element);
  player.angle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
  updatePlayer(player, { angle: player.angle });
};

onMouseClick = (event) => {
  if (event.button === 0) {
    const player = players[username];
    player.direction.x = event.clientX - 50;
    player.direction.y = event.clientY - 50;
    socket.send(JSON.stringify({
      player: {
        user_id: user_id,
        x: player.x,
        y: player.y,
        directionX: player.direction.x,
        directionY: player.direction.y
      }
    }));
  }
};

onKeyDown = (event) => {
  console.log(`KeyboardEvent: key='${event.key}' | code='${event.code}'`);
};

onChatSubmit = (event) => {
  event.preventDefault();
  const text = chatInput.value;
  chatInput.value = '';
  if (text.length === 0) {
    return;
  }
  socket.send(JSON.stringify({ message: { text, username } }));
};

onSocketOpen = () => {
  connected = true;
  const player = players[username];
  socket.send(JSON.stringify({
    player: {
      user_id: user_id,
      x: player.x,
      y: player.y,
      angle: player.angle
    }
  }));
};

onSocketClose = () => {
  connected = false;
  clearInterval(movementLoop);
  clearInterval(backupLoop);
  clearInterval(rotationLoop);
  console.log('Disconnected.');
};

onSocketMessage = (ev) => {
  const raw_data = JSON.parse(ev.data);
  console.log({ received: raw_data });
  if (raw_data["player"] !== undefined) {
    const data = raw_data["player"];
    if (data.username === username) {
      return;
    }
    const player = players[data.username];
    if (player) {
      updatePlayer(player, data);
    } else {
      createPlayer(data.username, data);
    }
  }
  if (raw_data["message"] !== undefined) {
    const data = raw_data["message"];
    const message = document.createElement('div');
    const msg_username = document.createElement('span');
    const msg_text = document.createElement('span');
    msg_username.innerText = data.username;
    msg_username.className = 'username';
    msg_text.innerText = ': ' + data.text;
    msg_text.className = 'text';
    message.classList.add('message');
    if (data.username === username) {
      message.classList.add('self');
    }

    message.appendChild(msg_username);
    message.appendChild(msg_text);
    chatMessages.appendChild(message);
  }
};

// Loops
const movementLoop = setInterval(() => {
  for (const username in players) {
    const player = players[username];
    const move = {
      speed: 20,
      x: Math.abs(player.x - player.direction.x),
      y: Math.abs(player.y - player.direction.y),
    };
    move.movementX = Math.round(move.x / (move.x + move.y) * move.speed);
    move.movementY = move.speed - move.movementX;

    if (player.x < player.direction.x) {
      player.x += Math.min(move.movementX, player.direction.x - player.x);
    } else if (player.x > player.direction.x) {
      player.x -= Math.min(move.movementX, player.x - player.direction.x);
    }

    if (player.y < player.direction.y) {
      player.y += Math.min(move.movementY, player.direction.y - player.y);
    } else if (player.y > player.direction.y) {
      player.y -= Math.min(move.movementY, player.y - player.direction.y);
    }

    // Update the position of the player
    updatePlayer(player, {x: player.x, y: player.y});
  }
}, 50);

const rotationLoop = setInterval(() => {
  if (!connected) {
    return;
  }
  const player = players[username];
  if (player.lastAngle === player.angle) {
    return;
  }
  player.lastAngle = player.angle;
  socket.send(JSON.stringify({
    player: {
      user_id: user_id,
      angle: player.angle
    }
  }));
}, 100);

const backupLoop = setInterval(() => {
  if (!connected) {
    return;
  }
  const player = players[username];
  socket.send(JSON.stringify({
    player: {
      user_id: user_id,
      x: player.x,
      y: player.y,
      directionX: player.direction.x,
      directionY: player.direction.y
    }
  }));
}, 5000);


// Player related functions
function createPlayer(username, data) {
  if (username === undefined) {
    return undefined;
  }
  if (players[username] !== undefined) {
    return players[username];
  }

  const newPlayer = {
    username: username,
    x: data.x,
    y: data.y,
    angle: data.angle,
    direction: { x: data.x, y: data.y },
    element: document.createElement('div'),
  }

  const cube = document.createElement('div');
  const name = document.createElement('span');

  newPlayer.element.className = 'player';
  newPlayer.element.dataset.value = username;
  newPlayer.element.style.left = `${data.x}px`;
  newPlayer.element.style.top = `${data.y}px`;
  cube.className = 'cube';
  cube.style.transform = `rotate(${data.angle}rad)`;
  name.innerText = username;

  newPlayer.element.appendChild(cube);
  newPlayer.element.appendChild(name);
  document.getElementById('game').appendChild(newPlayer.element);
  players[username] = newPlayer;
  return newPlayer;
}

function updatePlayer(player, data) {
  if (!data) {
    return;
  }
  if (!player) {
    return;
  }
  if (data.alive === false) {
    player.element.remove();
    delete players[data.username];
  }
  if (data.x !== undefined) {
    player.element.style.left = `${data.x}px`;
  }
  if (data.y !== undefined) {
    player.element.style.top = `${data.y}px`;
  }
  if (data.angle !== undefined) {
    const cube = player.element.getElementsByClassName('cube')[0];
    cube.style.transform = `rotate(${data.angle}rad)`;
  }
  if (data.directionX !== undefined) {
    player.direction.x = data.directionX;
  }
  if (data.directionY !== undefined) {
    player.direction.y = data.directionY;
  }
}
