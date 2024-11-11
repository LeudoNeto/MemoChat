from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()

class ChatMessage(BaseModel):
    id: int
    title: str
    first_message: str
    last_message_time: str

class Message(BaseModel):
    id: int
    chat_id: int
    is_user: bool
    content: str
    timestamp: str

fake_db = [
    {"id": 1, "title": "Chat com João", "first_message": "Oi João, tudo bem?", "last_message_time": "2024-11-08 14:30:00"},
    {"id": 2,"title": "Suporte Técnico", "first_message": "Como posso te ajudar?", "last_message_time": "2024-11-09 10:00:00"},
    {"id": 3,"title": "Grupo de Trabalho", "first_message": "Pessoal, vamos discutir o projeto", "last_message_time": "2024-11-09 12:15:00"},
]

@app.get("/api/chats/", response_model=List[ChatMessage])
async def get_all_chats():
    return fake_db

fake_messages_db = [
    {"id": 1, "chat_id": 1, "is_user": False, "content": "Oi João, como posso te ajudar?", "timestamp": "2024-11-08 14:32:00"},
    {"id": 2, "chat_id": 1, "is_user": True, "content": "Tudo bem, obrigado!", "timestamp": "2024-11-08 14:33:00"},
    {"id": 3, "chat_id": 2, "is_user": False, "content": "Bem-vindo ao suporte técnico!", "timestamp": "2024-11-09 10:05:00"},
    {"id": 4, "chat_id": 2, "is_user": True, "content": "Estou com um problema.", "timestamp": "2024-11-09 10:06:00"},
    {"id": 5, "chat_id": 3, "is_user": False, "content": "Vamos discutir o projeto?", "timestamp": "2024-11-09 12:17:00"},
    {"id": 6, "chat_id": 3, "is_user": True, "content": "Sim, estou pronto para começar.", "timestamp": "2024-11-09 12:18:00"},
]

@app.get("/api/messages/{chat_id}/", response_model=List[Message])
async def get_messages_by_chat_id(chat_id: int):
    # Filtra as mensagens pelo chat_id
    messages = [message for message in fake_messages_db if message["chat_id"] == chat_id]
    if not messages:
        raise HTTPException(status_code=404, detail="Chat not found")
    return messages