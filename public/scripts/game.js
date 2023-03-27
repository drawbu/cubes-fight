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
  element: undefined,
  direction: { x: undefined, y: undefined },
};
player.element = createPlayer(username, player)
player.element.id = "player"
player.direction.x = player.x;
player.direction.y = player.y;

let lastAngle = 0;


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


// Main loop
setInterval(() => {
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

  /* Update the position */
  const data = {username: player.element.dataset.value}
  if (move.x !== 0) {
    player.element.style.left = `${player.x}px`;
    data.x = player.x;
  }
  if (move.y !== 0) {
    player.element.style.top = `${player.y}px`;
    data.y = player.y;
  }
  if (lastAngle !== player.angle) {
    player.element.style.transform = `rotate(${player.angle}rad)`;
    lastAngle = player.angle;
    data.angle = player.angle;
  }

  /* Update position and get all player positions */
  fetch('/update-player', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
    .then(res => res.ok ? res.json() : undefined)
    .then(players => {
      if (!players) {
        return;
      }

      /* Update existing players position */
      document.querySelectorAll('.player').forEach((element) => {
        const name = element.dataset.value;
        if (name !== username) {
          updatePlayer(element, players[name]);
        }
        delete players[name];
      })

      /* Create new players */
      Object.keys(players).forEach((username) => {
        createPlayer(username, players[username]);
      })
  });
}, 50);

function createPlayer(username, data) {
  const newPlayer = document.createElement('div');
  newPlayer.className = 'player';
  newPlayer.dataset.value = username;
  newPlayer.style.left = `${data.x}px`;
  newPlayer.style.top = `${data.y}px`;
  newPlayer.style.transform = `rotate(${data.angle}rad)`;

  document.querySelector('body').appendChild(newPlayer);
  return newPlayer;
}

function updatePlayer(element, data) {
  element.style.left = `${data.x}px`;
  element.style.top = `${data.y}px`;
  element.style.transform = `rotate(${data.angle}rad)`;
}
