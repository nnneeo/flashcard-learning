from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from bson import ObjectId
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta

app = FastAPI()

SECRET_KEY = "secret"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class Card(BaseModel):
    question: str
    answer: str

class UserCredentials(BaseModel):
    username: str
    password: str

class HistoryEntry(BaseModel):
    card_id: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.flashcards_db

def create_token(username: str, role: str = "user"):
    data = {"sub": username, "role": role, "exp": datetime.utcnow() + timedelta(hours=24)}
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/auth/register")
async def register(user: UserCredentials):
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username taken")
    hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
    await db.users.insert_one({"username": user.username, "password": hashed, "role": "user"})
    return {"ok": True}

@app.post("/api/auth/login")
async def login(user: UserCredentials):
    db_user = await db.users.find_one({"username": user.username})
    if not db_user or not bcrypt.checkpw(user.password.encode(), db_user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    role = db_user.get("role", "user")
    token = create_token(user.username, role)
    return {"access_token": token, "token_type": "bearer", "role": role}

@app.get("/api/cards")
async def get_cards(username: str = Depends(get_current_user)):
    cards = []
    async for card in db.flashcards.find({"username": username}):
        card["_id"] = str(card["_id"])
        card["id"] = card.pop("_id")
        cards.append(card)
    return cards

@app.post("/api/cards")
async def create_card(card: Card, username: str = Depends(get_current_user)):
    card = dict(card)
    card["username"] = username
    result = await db.flashcards.insert_one(card)
    card["id"] = str(result.inserted_id)
    del card["_id"]
    return card

@app.put("/api/cards/{card_id}")
async def update_card(card_id: str, card: Card, username: str = Depends(get_current_user)):
    await db.flashcards.update_one(
        {"_id": ObjectId(card_id), "username": username},
        {"$set": dict(card)}
    )
    return {"id": card_id, "question": card.question, "answer": card.answer}

@app.delete("/api/cards/{card_id}")
async def delete_card(card_id: str, username: str = Depends(get_current_user)):
    await db.flashcards.delete_one({"_id": ObjectId(card_id), "username": username})
    return {"ok": True}

@app.post("/api/history")
async def log_history(entry: HistoryEntry, username: str = Depends(get_current_user)):
    card = await db.flashcards.find_one({"_id": ObjectId(entry.card_id)})
    await db.history.insert_one({
        "username": username,
        "card_id": entry.card_id,
        "question": card["question"],
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"ok": True}

@app.get("/api/admin/history")
async def get_all_history(username: str = Depends(get_current_user)):
    user = await db.users.find_one({"username": username})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    history = []
    async for entry in db.history.find().sort("timestamp", -1):
        entry["_id"] = str(entry["_id"])
        history.append(entry)
    return history
