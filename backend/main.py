from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import get_connection
from models import TradeCreate
from datetime import date

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later restrict to localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is running"}

# Get trades by date range
@app.get("/transactions/by-date")
def get_transactions_by_date(start: date, end: date):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT *
            FROM transactions
            WHERE timestamp BETWEEN %s AND %s
            ORDER BY timestamp;
            """,
            (start, end),
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

@app.get("/transactions/stats")
def get_transaction_stats():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                stock,
                COUNT(*) AS total_transactions
            FROM transactions
            GROUP BY stock
            ORDER BY stock;
            """
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()  
        

@app.get("/transactions/by-stock-date")
def get_transactions_by_stock_and_date(stock: str, trade_date: date):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT *
            FROM transactions
            WHERE stock = %s
              AND timestamp = %s
            ORDER BY user_id, id;
            """,
            (stock, trade_date),
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

@app.get("/transactions/holdings")
def get_user_holdings_as_of_date(user_id: int, end: date):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                stock,
                SUM(
                    CASE
                        WHEN side = 'Buy' THEN quantity
                        WHEN side = 'Sell' THEN -quantity
                        ELSE 0
                    END
                ) AS shares_held
            FROM transactions
            WHERE user_id = %s
              AND timestamp <= %s
            GROUP BY stock
            HAVING SUM(
                CASE
                    WHEN side = 'Buy' THEN quantity
                    WHEN side = 'Sell' THEN -quantity
                    ELSE 0
                END
            ) >= 0
            ORDER BY stock;
            """,
            (user_id, end),
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()             

# Get recent trades for a user
@app.get("/transactions/{user_id}")
def get_transactions(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT *
            FROM transactions
            WHERE user_id = %s
            ORDER BY timestamp DESC
            LIMIT 20;
            """,
            (user_id,),
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

# Insert new trade
@app.post("/transactions")
def create_transaction(trade: TradeCreate):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO transactions (user_id, stock, price, quantity, side, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *;
            """,
            (
                trade.user_id,
                trade.stock,
                trade.price,
                trade.quantity,
                trade.side,
                trade.timestamp,
            ),
        )

        new_trade = cur.fetchone()
        conn.commit()
        return new_trade
    finally:
        cur.close()
        conn.close()