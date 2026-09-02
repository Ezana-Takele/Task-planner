# Task Planner — Executive Full-Stack Workspace

A high-performance, responsive task planning and collaboration web application built with **React (Vite)**, **Node.js (Express)**, and **MySQL**.

Designed with the **Executive Monochrome Aero** aesthetic, high-contrast accessible typography, and production-grade security architecture.

---

## ✨ Features

- **Executive Kanban & List Views**: Real-time deliverable tracking with status columns (*To Do*, *In Progress*, *Completed*), drag-friendly quick status updates, priority indicators, and progress calculation.
- **Two-Step Email OTP Authentication**: 6-digit one-time password security for account registration and sign-in.
- **Multi-User Task Sharing**: Collaborate with team members by entering their numeric **User ID**, username, or email with granular permissions (*Can Edit* or *View Only*).
- **Subtasks & Deliverable Estimation**: Track subtask checklists, estimated effort minutes, and dynamic completion percentages.
- **Data Portability**: Full JSON export capability with one click.
- **Cloud Database Ready**: Built-in support for cloud MySQL providers (TiDB Cloud, Railway, Aiven) with automatic SSL negotiation.
- **Vercel Serverless Ready**: Configured with `vercel.json` and `api/index.js` for instant monorepo deployment.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Lucide Icons, CSS Custom Properties (Aero Design) |
| **Backend API** | Node.js, Express, MVC Pattern, Rate Limiting, Helmet Security |
| **Database** | MySQL 8.0 / TiDB Cloud Serverless (Parameterized Prepared Statements) |
| **Authentication** | JSON Web Tokens (JWT Bearer), Bcrypt (10 Salt Rounds) |
| **Email Service** | Nodemailer SMTP engine (supports Gmail, Brevo, Resend, SendGrid) |

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Ezana-Takele/Task-planner.git
cd Task-planner
```

### 2. Install dependencies
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

### 3. Environment Configuration
Copy the environment template:
```bash
cp backend/.env.example backend/.env
```
Configure your database settings in `backend/.env` (supports local MySQL or cloud `DATABASE_URL`).

### 4. Run Development Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`

---

## 🌐 Deployment

### Deploying to Vercel
1. Push this repository to your GitHub account.
2. Go to [vercel.com](https://vercel.com) and click **Import Project**.
3. Add your environment variables in Vercel settings:
   - `DATABASE_URL`: Your cloud MySQL connection string
   - `JWT_SECRET`: A secure random string
4. Click **Deploy** — Vercel handles both the static frontend and serverless API functions automatically via `vercel.json`.

---

## 🔒 Security

- **Zero Plaintext Passwords**: Passwords are salted with 10 cryptographic rounds of Bcrypt and stored exclusively in the database server.
- **SQL Injection Prevention**: All queries use parameterized prepared statements (`db.execute()`).
- **Defensive Rate Limiting**: All authentication endpoints are protected against brute-force attacks via `express-rate-limit`.

