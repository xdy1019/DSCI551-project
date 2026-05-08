from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import get_connection
from models import TradeCreate
from datetime import date

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def run_explain_analyze(sql_query: str, params: tuple = ()):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("EXPLAIN ANALYZE " + sql_query, params)
        rows = cur.fetchall()

        explain_lines = []
        for row in rows:
            if isinstance(row, dict):
                explain_lines.append(row["QUERY PLAN"])
            else:
                explain_lines.append(row[0])

        return {"explain": "\n".join(explain_lines)}
    finally:
        cur.close()
        conn.close()


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


@app.get("/transactions/by-date/explain")
def explain_transactions_by_date(start: date, end: date):
    sql_query = """
        SELECT *
        FROM transactions
        WHERE timestamp BETWEEN %s AND %s
        ORDER BY timestamp;
    """
    return run_explain_analyze(sql_query, (start, end))


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


@app.get("/transactions/stats/explain")
def explain_transaction_stats():
    sql_query = """
        SELECT
            stock,
            COUNT(*) AS total_transactions
        FROM transactions
        GROUP BY stock
        ORDER BY stock;
    """
    return run_explain_analyze(sql_query)


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


@app.get("/transactions/by-stock-date/explain")
def explain_transactions_by_stock_and_date(stock: str, trade_date: date):
    sql_query = """
        SELECT *
        FROM transactions
        WHERE stock = %s
          AND timestamp = %s
        ORDER BY user_id, id;
    """
    return run_explain_analyze(sql_query, (stock, trade_date))


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
            ) > 0
            ORDER BY stock;
            """,
            (user_id, end),
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@app.get("/transactions/holdings/explain")
def explain_user_holdings_as_of_date(user_id: int, end: date):
    sql_query = """
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
        ) > 0
        ORDER BY stock;
    """
    return run_explain_analyze(sql_query, (user_id, end))


@app.get("/transactions/recent/explain")
def explain_recent_transactions(user_id: int):
    sql_query = """
        SELECT *
        FROM transactions
        WHERE user_id = %s
        ORDER BY timestamp DESC
        LIMIT 20;
    """
    return run_explain_analyze(sql_query, (user_id,))


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