// Get the user_id from the local storage
const user_id = localStorage.getItem('user_id');
let socket;
let connected = false;
let username;
const player = {
  x: 300,
  y: 300,
  angle: 0,
  alive: true,
  element: undefined,
  direction: { x: undefined, y: undefined },
  lastAngle: 0,
};
let started = false;

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
  player.element = createPlayer(username, player)
  player.element.id = 'player'
  player.direction.x = player.x;
  player.direction.y = player.y;

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


const chat = document.getElementById('chat');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

function getCenterCoordinates(element) {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
}


// Events
onMouseMove = (event) => {
  const center = getCenterCoordinates(player.element);
  player.angle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
  updatePlayer(player.element, { angle: player.angle });
};

onMouseClick = (event) => {
  if (event.button === 0) {
    player.direction.x = event.clientX - 50;
    player.direction.y = event.clientY - 50;
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
  clearInterval(mainLoop);
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
    const element = document.querySelector(`[data-value="${data.username}"]`);
    if (element) {
      updatePlayer(element, data);
    }
    else {
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


// Main loop
const mainLoop = setInterval(() => {
  if (!started) {
    return;
  }
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

  // Update the position
  const data = {}
  if (move.x !== 0) {
    data.x = player.x;
  }
  if (move.y !== 0) {
    data.y = player.y;
  }
  if (player.lastAngle !== player.angle) {
    player.lastAngle = player.angle;
    data.angle = player.angle;
  }
  if (Object.keys(data).length !== 0 && connected) {
    updatePlayer(player.element, player);
    data.user_id = user_id;
    socket.send(JSON.stringify({ player: data }));
  }
}, 50);


// Player related functions
function createPlayer(username, data) {
  const newPlayer = document.createElement('div');
  const cube = document.createElement('div');
  const name = document.createElement('span');

  newPlayer.className = 'player';
  newPlayer.dataset.value = username;
  newPlayer.style.left = `${data.x}px`;
  newPlayer.style.top = `${data.y}px`;
  cube.className = 'cube';
  cube.style.transform = `rotate(${data.angle}rad)`;
  name.innerText = username;

  newPlayer.appendChild(cube)
  newPlayer.appendChild(name)
  document.getElementById('game').appendChild(newPlayer);
  return newPlayer;
}

function updatePlayer(element, data) {
  if (data.alive === false) {
    element.remove();
  }
  if (data.x !== undefined) {
    element.style.left = `${data.x}px`;
  }
  if (data.y !== undefined) {
    element.style.top = `${data.y}px`;
  }
  if (data.angle !== undefined) {
    const cube = element.getElementsByClassName('cube')[0];
    cube.style.transform = `rotate(${data.angle}rad)`;
  }
}
