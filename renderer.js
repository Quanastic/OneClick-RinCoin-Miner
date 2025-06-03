const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const savedAddress = localStorage.getItem('walletAddress');
  if (savedAddress) {
    document.getElementById('wallet').value = savedAddress;
  }

  const readme = document.getElementById("readme");
  const show = document.getElementById("show");

  readme.onclick = () => {
    show.style.display = show.style.display === 'none' ? 'block' : 'none';
  };
});

window.startMining = () => {
  const wallet = document.getElementById('wallet').value.trim();
  const output = document.getElementById('output');

  if (!/^rin1[a-z0-9]{30,}$/i.test(wallet)) {
    output.textContent = '❌ Invalid wallet address.';
    return;
  }

  localStorage.setItem('walletAddress', wallet);
  ipcRenderer.send('start-miner', wallet);
};

ipcRenderer.on('miner-output', (event, message) => {
  const output = document.getElementById('output');
  output.textContent += message;
  output.scrollTop = output.scrollHeight;
});

window.clearOutput = () => {
  document.getElementById('output').textContent = '';
};


