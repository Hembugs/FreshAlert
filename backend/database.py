import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'freshalert.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            barcode TEXT,
            expiry_date TEXT NOT NULL
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            token TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def add_product(name, expiry_date, barcode=None):
    conn = get_connection()
    conn.execute(
        'INSERT INTO products (name, barcode, expiry_date) VALUES (?, ?, ?)',
        (name, barcode, expiry_date)
    )
    conn.commit()
    conn.close()

def get_all_products():
    conn = get_connection()
    products = conn.execute('SELECT * FROM products ORDER BY expiry_date ASC').fetchall()
    conn.close()
    return [dict(p) for p in products]

def delete_product(product_id):
    conn = get_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()

def get_expiring_products(days):
    conn = get_connection()
    products = conn.execute('''
        SELECT * FROM products
        WHERE DATE(expiry_date) = DATE('now', ? || ' days')
    ''', (str(days),)).fetchall()
    conn.close()
    return [dict(p) for p in products]

def save_fcm_token(token):
    conn = get_connection()
    conn.execute('DELETE FROM tokens')
    conn.execute('INSERT INTO tokens (token) VALUES (?)', (token,))
    conn.commit()
    conn.close()

def get_fcm_token():
    conn = get_connection()
    try:
        row = conn.execute('SELECT token FROM tokens LIMIT 1').fetchone()
        conn.close()
        return row['token'] if row else None
    except:
        conn.close()
        return None