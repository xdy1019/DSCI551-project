import psycopg2
from psycopg2.extras import RealDictCursor

def get_connection():
    return psycopg2.connect(
        dbname="trading_db",
        user="mac",      #change if needed
        password="",  
        host="localhost",
        port="5432",
        cursor_factory=RealDictCursor
    )