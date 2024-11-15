import os
import json
import dotenv
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

import vertexai

from langchain_google_vertexai import ChatVertexAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage
from langchain.tools import tool

from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

dotenv.load_dotenv('.env')
vertexai.init(project="light-haven-434800-m1", location="us-central1")

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


model = ChatVertexAI(
    model="gemini-1.5-flash",
    max_tokens=8192,
    temperature=1,
    top_p=0.95,
    max_retries=20,
)

infos = []

@tool
def save_info_in_db(info: str) -> str:
    """Save the information in database."""
    infos.append(info)
    return f"Information {info} saved."

@tool
def search_info_in_db(query: str) -> str:
    """Search for the information in database."""
    return "\n".join([info for info in infos if query in info])

search = TavilySearchResults(
    max_results=3,
    search_depth="advanced",
    include_answer=True,
    include_raw_content=True,
)

tools = [save_info_in_db, search_info_in_db, search]

memory = MemorySaver()
config = {"thread_id": "0"}

prompt = """
    system: Você é um chatbot interativo que aprende e se adapta com base nas interações do usuário, usando as ferramentas a seguir para tornar as respostas mais precisas:

    Pesquisa na internet com Tavily: Use Tavily para pesquisar informações e verificar declarações feitas pelo usuário. Caso a resposta ou verificação seja confiável, responda e considere a declaração válida para armazenamento.

    Banco vetorial para salvar preferências e informações: Quando o usuário compartilhar uma preferência, como tom de linguagem, salve-a diretamente. Caso o usuário envie uma declaração ou fato sobre um tema, utilize Tavily para verificar a veracidade antes de armazenar. Armazene somente informações confirmadas como verdadeiras.

    Pesquisa em banco vetorial para consultas rápidas: Para perguntas e preferências anteriormente registradas, consulte o banco vetorial para fornecer respostas personalizadas de forma consistente.

    
    Exemplo de Fluxo de Interação:

    Usuário: "Prefiro um tom mais formal nas respostas."
    Ação: Salve a preferência no banco vetorial.

    Usuário: "A primeira viagem ao espaço foi em 1961."
    Ação: Use Tavily para verificar a informação. Se confirmada, salve a informação no banco vetorial; caso contrário, solicite confirmação adicional ao usuário.
    
    Usuário: "Quero saber qual é a capital do Brasil."
    Ação: Responda com a informação confirmada e relevante; caso não esteja armazenada, consulte Tavily e responda diretamente.
    
    Usuário: "Gosto de respostas curtas e objetivas."
    Ação: Salve essa preferência e adapte futuras respostas para o usuário.
    """


agent = create_react_agent(model, tools, checkpointer=memory, state_modifier=prompt)

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
            await db["messages"].insert_one(message_data)
            
            for connection in connections[chat_id]:
                await connection.send_text(json.dumps({"is_user": True, "content": data, "timestamp": message.timestamp}))

            complete_response = ""
            async for event in agent.astream_events(
                {"messages": [HumanMessage(content=data)]}, config, version="v1"
            ):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        complete_response += content
                        for connection in connections[chat_id]:
                            await connection.send_text(json.dumps({
                                "is_user": False,
                                "content": content,
                                "is_complete": False,  # Stream ainda em andamento
                                "timestamp": message.timestamp
                            }))

            for connection in connections[chat_id]:
                await connection.send_text(json.dumps({
                    "is_user": False,
                    "content": "",
                    "is_complete": True,  # Stream concluído
                    "timestamp": message.timestamp
                }))

            message = Message(chat_id=chat_id, is_user=False, content=complete_response, timestamp=datetime.now().isoformat())
            message_data = message.model_dump(exclude={"id"})
            await db["messages"].insert_one(message_data)

    except WebSocketDisconnect:
        connections[chat_id].remove(websocket)
        if not connections[chat_id]:  # Remove o chat_id se não houver mais conexões
            del connections[chat_id]