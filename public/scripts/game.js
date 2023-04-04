// Get the user_id from the local storage
const user_id = localStorage.getItem('user_id');
let socket;
let connected = false;
let username;
const chat = document.getElementById('chat');
const chatMessages = document.getElementById('chat-messages');
const playerCount = document.getElementById('player-count');
const chatInput = document.getElementById('chat-input');
let started = false;
const players = {};
let hoveringChat = false;
const background = document.getElementById('background-grid');
const camera = {
  x: 0,
  y: 0,
  elementX: document.getElementById('position-x'),
  elementY: document.getElementById('position-y'),
}


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
  const player = new Player(username, {x: 300, y: 300, angle: 0});
  player.element.id = 'player'
  player.lastAngle = 0;
  players[username] = player;

  const websocketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(websocketProtocol + '//' + location.host + '/ws')
  socket.onopen = onSocketOpen;
  socket.onclose = onSocketClose;
  socket.onmessage = onSocketMessage;
  window.onmousemove = onMouseMove;
  window.onmouseup = onMouseClick;
  window.onkeydown = onKeyDown;
  chat.onsubmit = onChatSubmit;
  chat.onmouseover = onMouseOverChat;
  chat.onmouseout = onMouseOutChat;

  started = true;
  clearInterval(onUsernameSet);
});


// Events
onMouseMove = (event) => {
  const player = players[username];
  const center = player.getCenterCoordinates();
  const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
  player.update({ angle });
};

onMouseClick = (event) => {
  if (event.button === 0 && !hoveringChat) {
    const player = players[username];
    player.direction.x = event.clientX - 50 + camera.x;
    player.direction.y = event.clientY - 50 + camera.y;
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

onMouseOverChat = () => {
  hoveringChat = true;
}

onMouseOutChat = () => {
  hoveringChat = false;
}

onKeyDown = (event) => {
  console.log(`KeyboardEvent: key='${event.key}' | code='${event.code}'`);
  if (event.key === 'ArrowRight') {
    camera.x += 10;
  }
  if (event.key === 'ArrowLeft') {
    camera.x -= 10;
  }
  if (event.key === 'ArrowUp') {
    camera.y -= 10;
  }
  if (event.key === 'ArrowDown') {
    camera.y += 10;
  }
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
      player.update(data);
    } else {
      players[data.username] = new Player(data.username, data);
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
    chatMessages.scrollTop = message.offsetHeight + message.offsetTop;
  }
};

// Loops
const movementLoop = setInterval(() => {
  playerCount.innerText = Object.keys(players).length.toString();
  camera.elementX.innerText = camera.x;
  camera.elementY.innerText = camera.y;
  background.style['background-position-x'] = `${-camera.x}px`;
  background.style['background-position-y'] = `${-camera.y}px`;

  for (const username in players) {
    const player = players[username];
    const move = {
      speed: 20,
      x: Math.abs(player.x - player.direction.x),
      y: Math.abs(player.y - player.direction.y),
    };
    move.movementX = Math.round(move.x / (move.x + move.y) * move.speed);
    move.movementY = move.speed - move.movementX;

    let x = player.x;
    let y = player.y;
    if (player.x < player.direction.x) {
      x += Math.min(move.movementX, player.direction.x - player.x);
    } else if (player.x > player.direction.x) {
      x -= Math.min(move.movementX, player.x - player.direction.x);
    }

    if (player.y < player.direction.y) {
      y += Math.min(move.movementY, player.direction.y - player.y);
    } else if (player.y > player.direction.y) {
      y -= Math.min(move.movementY, player.y - player.direction.y);
    }

    player.update({ x, y })
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


class Player {
  username;
  x;
  y;
  angle;
  direction;
  element;
  cube;

  constructor(username, data) {
    this.username = username;
    this.x = data.x;
    this.y = data.y;
    this.angle = data.angle;
    this.direction = { x: data.x, y: data.y };
    this.element = document.createElement('div');
    this.element.className = 'player';
    this.element.dataset.value = username;
    this.element.style.left = `${data.x}px`;
    this.element.style.top = `${data.y}px`;
    this.cube = document.createElement('div');
    this.cube.className = 'cube';
    this.cube.style.transform = `rotate(${data.angle}rad)`;
    const name = document.createElement('span');
    name.innerText = username;

    this.element.appendChild(this.cube);
    this.element.appendChild(name);
    document.getElementById('players').appendChild(this.element);
  }

  update(data) {
    if (data.alive === false) {
      this.element.remove();
      delete players[data.username];
      return;
    }

    if (data.x !== undefined) {
      this.x = data.x;
      this.element.style.left = `${this.x - camera.x}px`;
    }
    if (data.y !== undefined) {
      this.y = data.y;
      this.element.style.top = `${this.y - camera.y}px`;
    }
    if (data.angle !== undefined) {
      this.angle = data.angle;
      this.cube.style.transform = `rotate(${this.angle}rad)`;
    }
    if (data.directionX !== undefined) {
      this.direction.x = data.directionX;
    }
    if (data.directionY !== undefined) {
      this.direction.y = data.directionY;
    }
  }

  getCenterCoordinates() {
    const { left, top, width, height } = this.element.getBoundingClientRect();
    return { x: left + width / 2, y: top + height / 2 };
  }
}
