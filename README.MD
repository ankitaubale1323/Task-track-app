# 🎯 Task Command — Priority Task Manager (FastAPI + React + MySQL)

## ⚡ Alert System
- **🔴 CRITICAL** → Toast popup + pulsing red badge in header
- **🟠 HIGH** → Toast popup + orange badge in header  
- **🟡 Medium / 🟢 Low** → Silently added, no alert

---

## 🗄️ MySQL Setup

```sql
CREATE DATABASE taskdb;
CREATE USER 'taskuser'@'localhost' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON taskdb.* TO 'taskuser'@'localhost';
FLUSH PRIVILEGES;
```

> The `tasks` table is **auto-created** on server startup — no manual migration needed.

---

## 🚀 Run the Backend

```bash
cd backend
pip install -r requirements.txt

# Set your DB credentials (edit .env.example → rename to .env, or export directly):
export DB_HOST=localhost
export DB_PASSWORD=yourpassword

uvicorn main:app --reload --port 8000
```

Check DB connection: http://localhost:8000/health

---

## 🖥️ Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

---

## 📦 API Endpoints

| Method | Endpoint       | Description                        |
|--------|----------------|------------------------------------|
| GET    | /tasks         | All tasks sorted by priority       |
| POST   | /tasks         | Create a task                      |
| PUT    | /tasks/{id}    | Update title/priority/complete/etc |
| DELETE | /tasks/{id}    | Delete a task                      |
| GET    | /health        | Health check + DB connection test  |

### POST /tasks example
```json
{
  "title": "Fix production bug",
  "description": "Memory leak in auth service",
  "priority": "critical",
  "due_date": "2026-06-10"
}
```

---

## 🗂️ MySQL Table Schema

```sql
CREATE TABLE tasks (
    id          VARCHAR(36)  PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    priority    ENUM('critical','high','medium','low') DEFAULT 'medium',
    due_date    DATE,
    completed   TINYINT(1)   DEFAULT 0,
    created_at  DATETIME     NOT NULL
);
```
