from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from bson import ObjectId

app = FastAPI()

class Card(BaseModel):
    question: str
    answer: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.flashcards_db

@app.get("/api/cards")
async def get_cards():
    cards = []
    async for card in db.flashcards.find():
        card["_id"] = str(card["_id"])
        card["id"] = card.pop("_id")
        cards.append(card)
    return cards

@app.post("/api/cards")
async def create_card(card: Card):
    card = dict(card)
    result = await db.flashcards.insert_one(card)
    card["id"] = str(result.inserted_id)
    del card["_id"]
    return card

@app.put("/api/cards/{card_id}")
async def update_card(card_id: str, card: Card):
    await db.flashcards.update_one(
        {"_id": ObjectId(card_id)},
        {"$set": dict(card)}
    )
    return {"id": card_id, "question": card.question, "answer": card.answer}

@app.delete("/api/cards/{card_id}")
async def delete_card(card_id: str):
    await db.flashcards.delete_one({"_id": ObjectId(card_id)})
    return {"ok": True}
