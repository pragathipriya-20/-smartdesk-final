# SmartDesk – Production Full-Stack AI Customer Support Management System


**SmartDesk** is an enterprise-ready, full-stack customer service operations platform equipped with AI ticket analysis, multi-user response threading, role-based access control (RBAC), SQLite persistent storage, and a responsive React frontend with Light/Dark mode.

---

## 🚀 Key Features

### 1. AI Copilot Integration
- **One-Click Diagnostic Triage:** Generates an executive problem summary and structured troubleshooting steps tailored to the issue category.
- **Empathetic Response Drafting:** Crafts ready-to-send customer support drafts addressing the customer by name.
- **Direct Reply Insertion:** Copy to clipboard or insert AI drafts directly into the reply box.
- **Hybrid Engine:** Uses OpenAI API when `OPENAI_API_KEY` is present, with an intelligent built-in rule engine fallback.

### 2. Multi-User Threading & Activity Stream
- **Full Ticket Conversation History:** Real-time chronological timeline for customer and staff replies.
- **Staff-Only Internal Notes:** Admins can post private internal notes (`🔒 Internal Note`) hidden from customer view via strict backend RBAC.
- **Author Identity Badges:** Clear visual distinction between Support Staff agents and Customers.

### 3. Advanced Filtering, Search & Pagination
- **Server-Side Pagination:** Supports custom page numbers and limit sizes (`?page=1&limit=10`).
- **Multi-Field Search:** Real-time query search across Ticket ID, Customer Name, Email, Subject, and Description.
- **Tri-Factor Filtering:** Simultaneous filtering by Status (`Open`, `In Progress`, `Resolved`), Priority (`Low`, `Medium`, `High`), and Category.
- **CSV Data Export:** Export filtered tickets to CSV spreadsheet with a single click.

### 4. Authentication, RBAC & Profile Management
- **Role-Based Access Control:** Separate workflows for `admin` (staff agents) and `user` (customers).
- **JWT & Password Security:** Passwords hashed with `bcryptjs` (salt 10); sessions authenticated via signed JWT.
- **Account Management Modal:** In-app profile editor (Name & Email) and secure password change with verification.

### 5. UI/UX Design System
- **Pure Vanilla CSS:** Custom design tokens without bulky external libraries.
- **Dark & Light Mode:** Persisted theme switch with smooth transitions.
- **Responsive Layout:** Optimized for mobile, tablet, and desktop viewports.
- **Toast Notifications:** Feedback system for user actions and errors.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Express 4, Node.js, `better-sqlite3`, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv` |
| **Testing** | Node.js Test Runner (`node:test`), `supertest` |
| **Frontend** | React 18, Vite 5, Vanilla CSS3 (Custom Design Tokens) |
| **Database** | SQLite with Foreign Keys & Cascading Deletes |

---

## 📁 Project Architecture

```
smartdesk_final-3/
├── backend/
│   ├── controllers/
│   │   ├── aiController.js       # AI analysis, summaries, and response generation
│   │   ├── authController.js     # Register, login, profile edit, password change
│   │   ├── commentController.js  # Ticket conversation threading & internal notes
│   │   └── requestController.js  # CRUD, filtering, pagination, and KPI metrics
│   ├── db/
│   │   └── index.js              # SQLite connection, migrations, seeding
│   ├── middleware/
│   │   └── auth.js               # JWT auth & adminOnly role verification
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth routes
│   │   └── requestRoutes.js      # /api/requests routes
│   ├── tests/
│   │   └── api.test.js           # Integration test suite (14 passing tests)
│   ├── app.js                    # Express app configuration & middleware
│   ├── server.js                 # Server listener entry point
│   ├── smartdesk.db              # SQLite database file
│   └── package.json
├── database/
│   └── schema.sql                # SQL DDL reference schema
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AISuggestionCard.jsx    # AI summary & draft generator
│   │   │   ├── AuthScreen.jsx          # Login & registration forms
│   │   │   ├── Navbar.jsx              # Header, theme toggle, profile trigger
│   │   │   ├── NewTicketModal.jsx      # Ticket creation modal with presets
│   │   │   ├── ProfileModal.jsx        # Profile update & password changer
│   │   │   ├── StatsOverview.jsx       # Interactive KPI summary cards
│   │   │   ├── TicketDetailModal.jsx   # Detailed view with comments & AI
│   │   │   ├── TicketList.jsx          # Table with pagination, sort & CSV export
│   │   │   └── Toast.jsx               # Floating toast alert banners
│   │   ├── services/
│   │   │   └── api.js                  # Centralized HTTP client
│   │   ├── main.jsx                    # Root app controller & state
│   │   └── style.css                   # Responsive design tokens & theme styles
│   └── vite.config.js
└── netlify.toml
```

---

## 💾 Database Schema

### `users`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `name`: TEXT NOT NULL
- `email`: TEXT NOT NULL UNIQUE
- `password_hash`: TEXT NOT NULL
- `role`: TEXT CHECK(role IN ('user','admin')) DEFAULT 'user'
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP

### `requests`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id`: INTEGER (FK to `users(id)` ON DELETE SET NULL)
- `customer`: TEXT NOT NULL
- `email`: TEXT NOT NULL
- `subject`: TEXT NOT NULL
- `description`: TEXT
- `category`: TEXT NOT NULL
- `priority`: TEXT DEFAULT 'Medium'
- `status`: TEXT DEFAULT 'Open'
- `ai_summary`: TEXT
- `ai_suggestions`: TEXT
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP

### `comments`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `request_id`: INTEGER NOT NULL (FK to `requests(id)` ON DELETE CASCADE)
- `user_id`: INTEGER NOT NULL (FK to `users(id)` ON DELETE CASCADE)
- `body`: TEXT NOT NULL
- `is_internal`: INTEGER DEFAULT 0 (1 = Staff internal note)
- `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Public | Register new customer account |
| `POST` | `/api/auth/login` | Public | Authenticate user & receive 7-day JWT |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user credentials |
| `PUT` | `/api/auth/profile` | Authenticated | Update full name or email |
| `PUT` | `/api/auth/change-password` | Authenticated | Change password securely |

### Support Requests (`/api/requests`)
| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/requests` | Authenticated | Paginated tickets (`?page=1&limit=10&status=Open&search=...`) |
| `POST` | `/api/requests` | Authenticated | Submit new ticket |
| `GET` | `/api/requests/stats` | Authenticated | KPI metrics (Total, Open, In Progress, Resolved) |
| `GET` | `/api/requests/:id` | Authenticated | Retrieve single ticket details |
| `PATCH` | `/api/requests/:id/status` | Admin Only | Update ticket status |
| `DELETE` | `/api/requests/:id` | Admin Only | Delete ticket |

### Threading & Comments
| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/requests/:id/comments` | Authenticated | Fetch thread comments (internal notes hidden from regular users) |
| `POST` | `/api/requests/:id/comments` | Authenticated | Add public comment or staff internal note (`is_internal: true`) |

### AI Copilot
| Method | Endpoint | Access | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/requests/:id/ai-suggest` | Authenticated | Generate AI issue summary and customer response draft |

---

## 🏃 Running the Application

### 1. Backend Setup
```bash
cd backend
npm install
npm test      # Runs automated Supertest integration test suite
npm start     # Starts API server on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev   # Starts Vite dev server on http://localhost:5173
```

---

## 🔑 Default Credentials
- **Admin Email:** `admin@smartdesk.com`
- **Admin Password:** `Admin@123`
- *Or register a new customer account directly from the auth screen.*

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
JWT_SECRET=smartdesk-production-super-secret-key-32chars
DB_PATH=smartdesk.db
# Optional: Real OpenAI integration key
OPENAI_API_KEY=
```

### Frontend (`frontend/.env`)
```env
# Leave blank for local development (uses Vite proxy to http://localhost:5000)
# Set to hosted backend URL in production
VITE_API_URL=
```
