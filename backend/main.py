from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import mysql.connector
import os
from dotenv import load_dotenv

# ─── Load .env file ───────────────────────────────────────
load_dotenv()

app = FastAPI(title="Task Priority Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── MySQL Config (reads from .env) ───────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "taskdb"),
}

def get_conn():
    return mysql.connector.connect(**DB_CONFIG)

# ─── Create table on startup ──────────────────────────────
@app.on_event("startup")
def create_table():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id          VARCHAR(36)  PRIMARY KEY,
            title       VARCHAR(255) NOT NULL,
            description TEXT,
            priority    ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
            due_date    DATE,
            completed   TINYINT(1)   NOT NULL DEFAULT 0,
            created_at  DATETIME     NOT NULL
        )
    """)
    conn.commit()
    cur.close()
    conn.close()

# ─── Models ───────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None

def row_to_dict(row):
    return {
        "id":          row[0],
        "title":       row[1],
        "description": row[2],
        "priority":    row[3],
        "due_date":    str(row[4]) if row[4] else None,
        "completed":   bool(row[5]),
        "created_at":  str(row[6]),
    }

# ─── Routes ───────────────────────────────────────────────
@app.get("/tasks")
def get_tasks():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, description, priority, due_date, completed, created_at
        FROM tasks
        ORDER BY completed ASC,
                 FIELD(priority, 'critical','high','medium','low')
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [row_to_dict(r) for r in rows]

@app.post("/tasks", status_code=201)
def create_task(task: TaskCreate):
    task_id = str(uuid.uuid4())
    now = datetime.utcnow()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO tasks (id, title, description, priority, due_date, completed, created_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (task_id, task.title, task.description, task.priority,
         task.due_date or None, False, now)
    )
    conn.commit()
    cur.close(); conn.close()
    return {
        "id": task_id, "title": task.title, "description": task.description,
        "priority": task.priority, "due_date": task.due_date,
        "completed": False, "created_at": str(now),
    }

@app.put("/tasks/{task_id}")
def update_task(task_id: str, update: TaskUpdate):
    conn = get_conn()
    cur = conn.cursor()
    fields, values = [], []
    if update.title       is not None: fields.append("title=%s");       values.append(update.title)
    if update.description is not None: fields.append("description=%s"); values.append(update.description)
    if update.priority    is not None: fields.append("priority=%s");    values.append(update.priority)
    if update.due_date    is not None: fields.append("due_date=%s");    values.append(update.due_date)
    if update.completed   is not None: fields.append("completed=%s");   values.append(int(update.completed))
    if not fields:
        raise HTTPException(400, "Nothing to update")
    values.append(task_id)
    cur.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id=%s", values)
    conn.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "Task not found")
    cur.execute("SELECT id,title,description,priority,due_date,completed,created_at FROM tasks WHERE id=%s", (task_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row_to_dict(row)

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM tasks WHERE id=%s", (task_id,))
    conn.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "Task not found")
    cur.close(); conn.close()
    return {"message": "Deleted"}

@app.get("/health")
def health():
    try:
        conn = get_conn(); conn.close()
        return {"status": "ok", "db": "mysql connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}