const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html', 'index.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html', 'login.html'));
});
app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html', 'signup.html'));
});

io.on('connection', (socket) => {
  console.log('새 사용자 접속!');

  socket.on('disconnect', () => {
    console.log('사용자 나감ㅠㅠ');
  });

  socket.on('chat message', (msg) => {
    console.log(`받은 메시지: ${msg}`);
    io.emit('chat message', msg);
  });
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT} 에서 실행 중..`);
});
