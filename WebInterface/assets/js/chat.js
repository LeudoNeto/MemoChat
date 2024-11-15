var chatsCard = document.getElementById('chatsCard');
var messagesCard = document.getElementById('messagesCard');
var chatsColumn = document.getElementById('chatsColumn');
var chatsList = document.getElementById('chatsList');
var chatsListOffCanvas = document.getElementById('chatsListOffCanvas');
var chatsOffCanvasControl = document.getElementById('chatsOffCanvasControl');
var messagesList = document.getElementById('messagesList');
var messagesListScroll = document.getElementById('messagesListScroll');
var chatTitle = document.getElementById('chatTitle');
var newChatButton = document.getElementById('newChatButton');
var enviarMensagemButton = document.getElementById('enviarMensagemButton');
var mensagemInput = document.getElementById('mensagemInput');
var ws = null;

document.addEventListener('DOMContentLoaded', function() {
    
    messagesCard.style.height = window.innerHeight - messagesCard.offsetTop - 32 + 'px';
    chatsCard.style.height = window.innerHeight - messagesCard.offsetTop - 32 + 'px';

    if (window.innerWidth < 768) {
        chatsOffCanvasControl.click();
    }

    fetch('/api/chats/')
    .then(response => response.json())
    .then(data => {
        data.forEach(chat => {
            let chatElement = document.createElement('div');
            chatElement.innerHTML = `
                <a href="#" onclick="preencherConversa(this, '${chat.id}')" class="d-flex flex-stack py-3 my-2 chat-item">
                    <div class="d-flex align-items-center">
                        <div class="ms-5">
                            <span href="#" class="fs-5 fw-bold text-gray-900 mb-2 chat-title">${chat.title}</span>
                            <div class="fw-semibold text-muted">${chat.first_message}</div>
                        </div>
                    </div>
                    <div class="d-flex flex-column align-items-end mx-2">
                        <span class="text-muted fs-7 mb-1">${calcularTempoPassado(chat.last_message_time)}</span>
                    </div>
                </a>
            `;
            (window.innerWidth < 768 ? chatsListOffCanvas : chatsList).appendChild(chatElement);
        });
    });

    newChatButton.addEventListener('click', () => {
        fetch('/api/chats/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({title: 'Novo Chat'})
        })
        .then(response => response.json())
        .then(data => {
            let chatElement = document.createElement('div');
            chatElement.innerHTML = `
                <a href="#" onclick="preencherConversa(this, '${data.id}')" class="d-flex flex-stack py-3 my-2 chat-item">
                    <div class="d-flex align-items-center">
                        <div class="ms-5">
                            <span href="#" class="fs-5 fw-bold text-gray-900 mb-2 chat-title">${data.title}</span>
                            <div class="fw-semibold text-muted">${data.first_message}</div>
                        </div>
                    </div>
                    <div class="d-flex flex-column align-items-end mx-2">
                        <span class="text-muted fs-7 mb-1">${calcularTempoPassado(data.last_message_time)}</span>
                    </div>
                </a>
            `;
            (window.innerWidth < 768 ? chatsListOffCanvas : chatsList).appendChild(chatElement);
            chatElement.click();
        });
    });

    enviarMensagemButton.addEventListener('click', () => {
        ws.send(mensagemInput.value);
        mensagemInput.value = '';
        enviarMensagemButton.disabled = true;
    });

});

var calcularTempoPassado = (lastMessageTime) => {
    var lastMessageDate = new Date(lastMessageTime);
    var now = new Date();
    var diff = now - lastMessageDate;
    var diffSeconds = diff / 1000;
    var diffMinutes = diffSeconds / 60;
    var diffHours = diffMinutes / 60;
    var diffDays = diffHours / 24;
    var diffMonths = diffDays / 30;
    var diffYears = diffMonths / 12;

    if (diffSeconds < 60) {
        return 'Agora';
    } else if (diffMinutes < 60) {
        return Math.floor(diffMinutes) + 'm';
    } else if (diffHours < 24) {
        return Math.floor(diffHours) + 'h';
    } else if (diffDays < 30) {
        return Math.floor(diffDays) + 'd';
    } else if (diffMonths < 12) {
        return Math.floor(diffMonths) + 'm';
    } else {
        return Math.floor(diffYears) + 'a';
    }
}

var preencherConversa = (conversa, conversaId) => {
    fetch(`/api/messages/${conversaId}/`)
    .then(response => response.json())
    .then(data => {
        messagesList.innerHTML = '';
        data.forEach(message => {
            let messageElement = document.createElement('div');
            messageElement.innerHTML = message.is_user ? userMessage(message) : chatbotMessage(message);
            messagesList.appendChild(messageElement);

            messagesListScroll.scrollTo({
                top: messagesListScroll.scrollHeight,
                behavior: 'smooth'
            });
        });
        document.querySelectorAll('.chat-item').forEach(conversa => {
            conversa.classList.remove('active');
        });
        conversa.classList.add('active');
        chatTitle.innerText = conversa.querySelector('.chat-title').innerText;
        if (window.innerWidth < 768) {
            chatsOffCanvasControl.click();
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }

        ws = new WebSocket(`ws://${window.location.hostname}/ws/${conversaId}`);

        ws.onopen = () => {
            enviarMensagemButton.disabled = false;
            console.log("Conectado ao WebSocket");
        };

        ws.onclose = () => {
            enviarMensagemButton.disabled = true;
            console.log("Desconectado do WebSocket");
        };

        ws.onmessage = (event) => {
            console.log(event.data);
            const message = JSON.parse(event.data);
        
            if (message.is_user) {
                let messageElement = document.createElement('div');
                messageElement.innerHTML = userMessage(message);
                messagesList.appendChild(messageElement);

                let chatbotMessageElement = document.createElement('div');
                chatbotMessageElement.id = 'chatbot-msg-streaming';
                chatbotMessageElement.innerHTML = chatbotMessage({
                    content: `
                        <span class="typing-animation">
                            <span>.</span><span>.</span><span>.</span>
                        </span>
                    `,
                    timestamp: message.timestamp
                });
                messagesList.appendChild(chatbotMessageElement);

            } else {
                let chatbotMessageElement = document.getElementById('chatbot-msg-streaming');
                
                const messageContentElement = chatbotMessageElement.querySelector('#message-text');
                if (messageContentElement.querySelector('.typing-animation')) {
                    messageContentElement.innerHTML = '';
                }
                messageContentElement.textContent += message.content;
        
                if (message.is_complete) {
                    chatbotMessageElement.removeAttribute('id');
                    enviarMensagemButton.disabled = false;
                }
            }
        
            messagesListScroll.scrollTo({
                top: messagesListScroll.scrollHeight,
                behavior: 'smooth',
            });
        };
        

    })
    .catch(error => console.error('Erro ao carregar mensagens:', error));
};

var userMessage = (message) => {
    return `
        <div class="d-flex justify-content-end mb-10">
            <div class="d-flex flex-column align-items-end">
                <div class="d-flex align-items-center mb-2">
                    <div class="me-3">
                        <span class="text-muted fs-7 mb-1">${calcularTempoPassado(message.timestamp)}</span>
                    </div>
                    <div class="symbol symbol-35px symbol-circle">
                        <span class="symbol-label bg-light-danger text-danger fs-6 fw-bolder">You</span>
                    </div>
                </div>
                <div class="p-5 rounded bg-light-primary text-gray-900 fw-semibold mw-lg-400px text-end" id="message-text">
                    ${message.content}
                </div>
            </div>
        </div>
    `;
}

var chatbotMessage = (message) => {
    return `
        <div class="d-flex justify-content-start mb-10">
            <div class="d-flex flex-column align-items-start">
                <div class="d-flex align-items-center mb-2">
                    <div class="symbol symbol-35px symbol-circle">
                        <img alt="Pic" src="assets/investeailogo.png" />
                    </div>
                    <div class="ms-3">
                        <a href="#" class="fs-5 fw-bold text-gray-900 text-hover-primary me-1">Chatbot</a>
                        <span class="text-muted fs-7 mb-1">${calcularTempoPassado(message.timestamp)}</span>
                    </div>
                </div>
                <div class="p-5 rounded bg-light-info text-gray-900 fw-semibold mw-lg-400px text-start" id="message-text">
                    ${message.content}
                </div>
            </div>
        </div>
    `;
}