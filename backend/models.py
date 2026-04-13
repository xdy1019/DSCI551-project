from pydantic import BaseModel
from datetime import date
from typing import Literal

class TradeCreate(BaseModel):
    user_id: int
    stock: str
    price: float
    quantity: int
    side: Literal["Buy", "Sell"]
    timestamp: date