from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json
import os

app = FastAPI()

MONGO_DETAILS = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_DETAILS)
db = client["chat_app"]

class ChatMessage(BaseModel):
    id: Optional[str] = None
    title: str
    first_message: Optional[str] = ""
    last_message_time: Optional[str] = datetime.now().isoformat()


class Message(BaseModel):
    id: Optional[str] = None
    chat_id: str
    is_user: bool
    content: str
    timestamp: Optional[str] = datetime.now().isoformat()

    class Config:
        json_encoders = {ObjectId: str}


def chat_helper(chat) -> dict:
    return {
        "id": str(chat["_id"]),
        "title": chat["title"],
        "first_message": chat.get("first_message", ""),
        "last_message_time": chat.get("last_message_time", datetime.now().isoformat())
    }

def message_helper(message) -> dict:
    return {
        "id": str(message["_id"]),
        "chat_id": str(message["chat_id"]),
        "is_user": message["is_user"],
        "content": message["content"],
        "timestamp": message["timestamp"]
    }

@app.get("/api/chats/", response_model=List[ChatMessage])
async def get_all_chats():
    chats = []
    async for chat in db["chats"].find():
        chats.append(chat_helper(chat))
    return chats

@app.get("/api/messages/{chat_id}/", response_model=List[Message])
async def get_messages_by_chat_id(chat_id: str):
    messages = []
    async for message in db["messages"].find({"chat_id": chat_id}):
        messages.append(message_helper(message))
    return messages

@app.post("/api/chats/", response_model=ChatMessage)
async def create_chat(chat: ChatMessage):
    chat_data = chat.model_dump(exclude={"id"})
    new_chat = await db["chats"].insert_one(chat_data)
    created_chat = await db["chats"].find_one({"_id": new_chat.inserted_id})
    return chat_helper(created_chat)

@app.post("/api/messages/", response_model=Message)
async def create_message(message: Message):
    message_data = message.model_dump(exclude={"id"})
    new_message = await db["messages"].insert_one(message_data)
    created_message = await db["messages"].find_one({"_id": new_message.inserted_id})
    return message_helper(created_message)


connections = {}

@app.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    await websocket.accept()
    if chat_id not in connections:
        connections[chat_id] = []
    connections[chat_id].append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            
            message = Message(chat_id=chat_id, is_user=True, content=data, timestamp=datetime.now().isoformat())
            message_data = message.model_dump(exclude={"id"})
            new_message = await db["messages"].insert_one(message_data)
            message.id = str(new_message.inserted_id)
            
            for connection in connections[chat_id]:
                await connection.send_text(json.dumps({"is_user": True, "content": data, "timestamp": message.timestamp}))
            
            bot_response = f"Chatbot response to: {data}"
            message = Message(chat_id=chat_id, is_user=False, content=bot_response, timestamp=datetime.now().isoformat())
            message_data = message.model_dump(exclude={"id"})
            new_message = await db["messages"].insert_one(message_data)
            await websocket.send_text(json.dumps({"is_user": False, "content": bot_response, "timestamp": message.timestamp}))

    except WebSocketDisconnect:
        connections[chat_id].remove(websocket)
        if not connections[chat_id]:  # Remove o chat_id se não houver mais conexões
            del connections[chat_id]