var chatsCard = document.getElementById('chatsCard');
var messagesCard = document.getElementById('messagesCard');
var chatsColumn = document.getElementById('chatsColumn');
var chatsList = document.getElementById('chatsList');
var chatsListOffCanvas = document.getElementById('chatsListOffCanvas');
var offcanvas = new bootstrap.Offcanvas('.offcanvas-start');
var messagesList = document.getElementById('messagesList');
var messagesListScroll = document.getElementById('messagesListScroll');
var chatTitle = document.getElementById('chatTitle');
var newChatButtons = document.querySelectorAll('.new-chat-button');
var enviarMensagemButton = document.getElementById('enviarMensagemButton');
var mensagemInput = document.getElementById('mensagemInput');
var ws = null;

document.addEventListener('DOMContentLoaded', function() {
    
    newChatButtons.forEach(button => {
        button.addEventListener('click', () => {
            fetch('/api/chats/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: 'Novo Chat' })
            })
            .then(response => response.json())
            .then(data => {
                let chatElement = document.createElement('div');
                chatElement.innerHTML = `
                    <a href="#" onclick="preencherConversa(this, '${data.id}')" class="d-flex flex-stack py-3 my-2 chat-item">
                        <div class="d-flex align-items-center w-75">
                            <div class="ms-5 w-100">
                                <span href="#" class="fs-5 fw-bold text-gray-900 mb-2 chat-title">${data.title}</span>
                                <div class="fw-semibold text-muted chat-first-message">${data.first_message}</div>
                            </div>
                        </div>
                        <div class="d-flex flex-column align-items-end mx-2">
                            <span class="text-muted fs-7 mb-1">${calcularTempoPassado(data.last_message_time)}</span>
                        </div>
                    </a>
                `;
    
                const targetList = window.innerWidth < 768 ? chatsListOffCanvas : chatsList;
                targetList.insertBefore(chatElement, targetList.firstChild); // Adiciona antes do primeiro filho
    
                chatElement.querySelector('.chat-item').click();
            });
        });
    });
    

    fetch('/api/chats/')
    .then(response => response.json())
    .then(data => {
        const targetList = window.innerWidth < 768 ? chatsListOffCanvas : chatsList;
        data.forEach(chat => {
            let chatElement = document.createElement('div');
            chatElement.innerHTML = `
                <a href="#" onclick="preencherConversa(this, '${chat.id}')" class="d-flex flex-stack py-3 my-2 chat-item">
                    <div class="d-flex align-items-center w-75">
                        <div class="ms-5 w-100">
                            <span href="#" class="fs-5 fw-bold text-gray-900 mb-2 chat-title">${chat.title}</span>
                            <div class="fw-semibold text-muted chat-first-message">${chat.first_message}</div>
                        </div>
                    </div>
                    <div class="d-flex flex-column align-items-end mx-2">
                        <span class="text-muted fs-7 mb-1">${calcularTempoPassado(chat.last_message_time)}</span>
                    </div>
                </a>
            `;
            targetList.appendChild(chatElement);
        });
        if (data.length > 0) {
            targetList.children[0].querySelector('.chat-item').click();
        }
        else {
            newChatButtons[0].click();
            const checkForChats = setInterval(() => {
                if (targetList.children.length > 0) {
                    clearInterval(checkForChats);
                    targetList.children[0].querySelector('.chat-item').click();
                }
            }, 1000);

        }
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
    var diff = now - lastMessageDate + now.getTimezoneOffset() * 60000;
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
        chatTitle.innerText = conversa.querySelector('.chat-title').innerHTML;
        if (window.innerWidth < 768) {
            offcanvas.hide();
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }

        ws = new WebSocket(`ws://${window.location.hostname}/ws/${conversaId}`);

        ws.onopen = () => {
            enviarMensagemButton.disabled = false;
        };

        ws.onclose = () => {
            enviarMensagemButton.disabled = true;
        };

        ws.onmessage = (event) => {
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

                if (messagesList.children.length === 2) {
                    preencherConversaTituloFirstMessage(conversa, conversaId, message.content);
                }

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

var preencherConversaTituloFirstMessage = (conversa, conversaId, first_message) => {
    fetch(`/api/chats/${conversaId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ first_message: first_message })
    })
        .then(response => response.json())
        .then(data => {
            const titleElement = conversa.querySelector('.chat-title');
            const firstMessageElement = conversa.querySelector('.chat-first-message');

            const animateText = (element, newText, callback) => {
                let currentText = "";
                let index = 0;

                const interval = setInterval(() => {
                    if (index < newText.length) {
                        currentText += newText[index];
                        element.innerText = currentText;
                        index++;
                    } else {
                        clearInterval(interval);
                        if (callback) callback(); // Chama o callback após terminar
                    }
                }, 50);
            };

            animateText(titleElement, data.title, () => {
                animateText(firstMessageElement, data.first_message);
            });
            animateText(chatTitle, data.title);
        })
        .catch(error => {
            console.error("Erro ao atualizar conversa:", error);
        });
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