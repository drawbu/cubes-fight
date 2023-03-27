// Get the username
let username = null;
while (!username) {
  username = window.prompt('username: ')
}


// Let the game started
const player = {
  element: document.createElement('div'),
  position: { x: 300, y: 300 },
  direction: { x: 300, y: 300 },
  angle: 0,
};
player.element.className = "player"
player.element.id = "player"
player.element.dataset.value = username

document.querySelector('body').appendChild(player.element)

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
    x: Math.abs(player.position.x - player.direction.x),
    y: Math.abs(player.position.y - player.direction.y),
  };
  move.movementX = Math.round(move.x / (move.x + move.y) * move.speed);
  move.movementY = move.speed - move.movementX;

  if (player.position.x < player.direction.x) {
    player.position.x += Math.min(move.movementX, player.direction.x - player.position.x);
  } else if (player.position.x > player.direction.x) {
    player.position.x -= Math.min(move.movementX, player.position.x - player.direction.x);
  }

  if (player.position.y < player.direction.y) {
    player.position.y += Math.min(move.movementY, player.direction.y - player.position.y);
  } else if (player.position.y > player.direction.y) {
    player.position.y -= Math.min(move.movementY, player.position.y - player.direction.y);
  }

  /* Update the position */
  const data = {username: player.element.dataset.value}
  if (move.x !== 0) {
    player.element.style.left = `${player.position.x}px`;
    data.x = player.position.x;
  }
  if (move.y !== 0) {
    player.element.style.top = `${player.position.y}px`;
    data.y = player.position.y;
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
    .then(res => {
      return res.ok ? res.json() : undefined;
    })
    .then(players => {
      if (!players) {
        return;
      }

      /* Update existing players position */
      document.querySelectorAll('.player').forEach((element) => {
        const username = element.dataset.value;
        if (username === player.element.dataset.value) {
          delete players[username];
          return;
        }
        if (!(username in Object.keys(players))) {
          element.remove()
          return;
        }
        element.style.left = `${players[username].x}px`;
        element.style.top = `${players[username].y}px`;
        element.style.transform = `rotate(${players[username].angle}rad)`;
        delete players[username];
      })

      /* Create new players */
      Object.keys(players).forEach((username) => {
        const newPlayer = document.createElement('div');
        newPlayer.className = "player"
        newPlayer.dataset.value = username
        newPlayer.style.left = `${players[username].x}px`;
        newPlayer.style.top = `${players[username].y}px`;
        newPlayer.style.transform = `rotate(${players[username].angle}rad)`;

        document.querySelector('body').appendChild(newPlayer)
      })
  });
}, 50);
