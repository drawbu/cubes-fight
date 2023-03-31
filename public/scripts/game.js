// Get the username
let username = null;
while (!username) {
  username = window.prompt('username: ')
}


// Let the game started
const player = {
  x: 300,
  y: 300,
  angle: 0,
  alive: true,
  element: undefined,
  direction: { x: undefined, y: undefined },
  lastAngle: 0,
};
player.element = createPlayer(username, player)
player.element.id = 'player'
player.direction.x = player.x;
player.direction.y = player.y;

const websocketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(websocketProtocol + '//' + location.host + '/ws');

// Get the player list
const playerList = [];
document.querySelectorAll('.player').forEach((element) => {
  if (element.id !== 'player') {
    playerList.push(element);
  }
});

function getCenterCoordinates(element) {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
}


// Events
window.addEventListener('mousemove', (event) => {
  const center = getCenterCoordinates(player.element);
  player.angle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
  updatePlayer(player.element, { angle: player.angle })
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    player.direction.x = event.clientX - 50;
    player.direction.y = event.clientY - 50;
  }
});

window.addEventListener('keydown', (event) => {
  console.log(`KeyboardEvent: key='${event.key}' | code='${event.code}'`);
});

window.addEventListener('beforeunload', () => {
  socket.close();
});

socket.addEventListener('open', (_) => {
  socket.send(JSON.stringify({
    player: {
      username,
      x: player.x,
      y: player.y,
      angle: player.angle
    }
  }));
});

socket.addEventListener('close', (_) => {
  clearInterval(interval);
  console.log('WebSocket is closed now.');
});

socket.addEventListener('message', ev => {
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
});


// Main loop
const interval = setInterval(() => {
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
  if (Object.keys(data).length !== 0) {
    updatePlayer(player.element, player);
    data.username = player.element.dataset.value;
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
