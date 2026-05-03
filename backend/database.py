"""
database.py — PostgreSQL connection for DEMS
Place this file in: evidence-system/backend/

Configure the credentials below to match your PostgreSQL setup.
Default local PostgreSQL settings shown.
"""

import psycopg2

DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "database": "evidence_system",   # your DB name
    "user":     "postgres",      # your PostgreSQL username
    "password": "postgre123", # your PostgreSQL password
}


def get_connection():
    """Return a new psycopg2 connection. Caller is responsible for closing it."""
    return psycopg2.connect(**DB_CONFIG)