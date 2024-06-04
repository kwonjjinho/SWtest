document.getElementById('inquiry-form').addEventListener('submit', function(event) {
    event.preventDefault();
    alert('문의 제출 완료.');
});

const socket = io();

socket.on('connect', () => {
    console.log('Socket 연결 됐음');
});

const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('chat-message');
const usernameInput = document.getElementById('username');
const messages = document.getElementById('messages');
const chatContainer = document.getElementById('toggle-chat');
const toggleChatBtn = document.getElementById('toggle-chat-btn');
const openText = toggleChatBtn.dataset.openText;

toggleChatBtn.addEventListener('click', () => {
    const isVisible = chatContainer.style.display === 'block';
    chatContainer.style.display = isVisible ? 'none' : 'block';
    toggleChatBtn.textContent = isVisible ? openText : '닫기';
    toggleChatBtn.classList.toggle('small', !isVisible);
});
chatForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const message = messageInput.value.trim();
    console.log(`전송 버튼 클릭됨. 유저명: ${username}, 메시지: ${message}`);
    if (username && message) {
        const fullMessage = `${username}: ${message}`;
        socket.emit('chat message', fullMessage);
        messageInput.value = '';
    } else {
        console.log('유저명, 메시지중 값이 비었음');
    }
});

socket.on('chat message', function(msg) {
    console.log(`받은 메시지: ${msg}`);
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
});

