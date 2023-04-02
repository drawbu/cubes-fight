const form = document.getElementById('username-form');
const chatInput = document.getElementById('username-input');
const errorMessage = document.getElementById('error-message');


form.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = chatInput.value;
  if (username.length === 0) {
    return;
  }

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
    .then((res) => (res.status === 200) ? res.json() : null)
    .then((data) => {
      localStorage.removeItem('user_id')
      if (!data || !data['user_id']) {
        if (data && data['error']) {
          errorMessage.innerText = '⚠︎ ' + data['error'];
        } else {
          errorMessage.innerText = '⚠︎ An error as occurred. Please try again.';
        }
        return;
      }
      localStorage.setItem('user_id', data['user_id']);
      window.location.href = '/game';
    })
});
