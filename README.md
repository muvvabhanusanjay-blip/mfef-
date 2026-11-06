# SpendWise – Premium Finance Management Web Application

SpendWise is a full-stack personal finance and wealth tracking web application built with a premium dark fintech aesthetic (`#0B0B19` deep navy with `#00E6A0` neon mint accents). It empowers users to monitor their net cash balance, track categorized cash flows, manage monthly budgets, and reach savings goals with real-time analytics.

---

## 🎨 Visual Design System & Palette

SpendWise follows a dark SaaS design language:

| Design Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Main Background** | `#0B0B19` | Deep navy application canvas |
| **Sidebar Surface** | `#090916` | Dark navy navigation surface |
| **Primary Card** | `#101024` | Elevated dashboard widgets & tables |
| **Secondary Surface** | `#15152B` | Inner item cards, pills & inputs |
| **Primary Accent** | `#00E6A0` | Neon mint call-to-actions, active state & positive trends |
| **Secondary Accent** | `#00C98B` | Hover & focus highlights |
| **Income Indicator** | `#00E6A0` | Positive transactions & cash inflows |
| **Expense Indicator** | `#FF5B73` | Coral red for expenses & alerts |
| **Chart Blue** | `#579BFF` | Cash flow visualization accents |
| **Chart Purple** | `#A78BFA` | Savings rate & auxiliary indicators |

Typography is rendered in **Inter** with clean geometry (16px rounded cards, subtle 1px border `rgba(255, 255, 255, 0.07)`, and soft neon glows).

---

## 🚀 Key Features

1. **Authentication & Session Security**:
   - Cryptographic password hashing using `bcryptjs` (10 rounds).
   - Secure server-side sessions stored in MongoDB via `connect-mongo`.
   - `HttpOnly`, `SameSite: 'lax'` session cookies protecting against XSS/CSRF.
   - Brute-force rate limiting on login and signup routes.
2. **Interactive Financial Dashboard**:
   - Four top financial metric cards: **Available Balance**, **Total Income**, **Total Spent**, and **Savings Rate**.
   - **Cash Flow Overview**: Dual-line Chart.js smooth curve displaying income vs expense trends over customizable timeframes (`1W`, `1M`, `3M`, `1Y`).
   - **Spending Breakdown**: Doughnut Chart.js visualization with center total and categorized spending percentages.
   - **Recent Activity Feed**: Latest 5 transactions with category icons and quick actions.
   - **Savings Widget**: Top active savings goals with neon progress bars.
3. **Transaction Management (`transactions.html`)**:
   - Full CRUD operations (Add, Edit, Delete).
   - Live debounced keyword search on title and description.
   - Filter by type (`Income` / `Expense`), Category, and Date range.
   - Sort by Newest, Oldest, Highest, or Lowest amount.
   - Dynamic pagination.
4. **Budget Management (`budgets.html`)**:
   - Set overall monthly budgets and category-specific spending caps.
   - Real-time calculations: automatically aggregates expenses in that month/category from transactions.
   - Visual indicators: warning alerts (`isExceeded`) when approaching or breaching limits.
5. **Savings Goals (`goals.html`)**:
   - Track progress toward custom targets (e.g. Vacation, Emergency Fund, Home).
   - Direct deposit contributions updating virtual completion percentages in real time.
6. **In-Depth Analytics (`analytics.html`)**:
   - 6-month historical trajectory comparing monthly income vs expenses.
   - Detailed per-category table showing transaction count, average expense, and maximum single expense.
7. **User Preferences & Security (`settings.html`)**:
   - Update display name and default currency (`₹ INR`, `$ USD`, `€ EUR`, `£ GBP`).
   - Secure password update verifying current password.

---

## 📂 Project Directory Structure

```
Expense Tracker/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection logic
│   ├── controllers/
│   │   ├── authController.js     # Signup, login, logout, profile
│   │   ├── transactionController.js # Transaction CRUD & filtering
│   │   ├── budgetController.js   # Budget tracking & calculations
│   │   ├── goalController.js     # Savings goals & deposits
│   │   ├── dashboardController.js # Metric cards, cashflow, doughnut
│   │   └── analyticsController.js # Historical trends & category metrics
│   ├── middleware/
│   │   ├── authMiddleware.js     # Protected route session guard
│   │   └── rateLimiter.js        # Auth brute-force rate limiter
│   ├── models/
│   │   ├── User.js               # User schema & bcrypt verification
│   │   ├── Transaction.js        # Transaction schema & compound index
│   │   ├── Budget.js             # Budget schema with unique month/cat
│   │   └── SavingsGoal.js        # Goal schema with virtual progress %
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── goalRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── analyticsRoutes.js
│   ├── .env                      # Local configuration
│   ├── .env.example              # Environment variables template
│   ├── package.json              # Backend dependencies
│   ├── server.js                 # Express server & static asset host
│   ├── test-db.js                # Database connectivity test
│   ├── test-auth.js              # Auth & session test
│   ├── test-transactions.js      # Transaction & isolation test
│   ├── test-budgets-goals.js     # Budgets & goals calculations test
│   ├── test-dashboard-analytics.js # Dashboard metrics test
│   └── test-e2e.js               # Master integration test
│
├── frontend/
│   ├── index.html                # Gatekeeper redirect
│   ├── login.html                # Dark fintech sign in
│   ├── signup.html               # User registration
│   ├── dashboard.html            # Main dashboard
│   ├── transactions.html         # Transaction management
│   ├── analytics.html            # Financial analytics
│   ├── budgets.html              # Budget tracking
│   ├── goals.html                # Savings goals
│   ├── settings.html             # Preferences & security
│   ├── css/
│   │   ├── common.css            # Global CSS variables & components
│   │   ├── auth.css              # Auth screens styling
│   │   ├── dashboard.css         # Sidebar, header, dashboard grid
│   │   └── pages.css             # Tables, toolbar, responsive styles
│   └── js/
│       ├── api.js                # Fetch API client & formatters
│       ├── auth.js               # Auth forms logic
│       ├── dashboard.js          # Dashboard charts & components
│       ├── transactions.js       # Transaction table & filters
│       ├── analytics.js          # Analytics charts & breakdown
│       ├── budgets.js            # Budget progress & modal
│       ├── goals.js              # Goal cards & deposits
│       └── settings.js           # Profile & password updates
│
├── .gitignore
├── package.json                  # Root launcher
└── README.md
```

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (CSS Custom Properties), Vanilla JavaScript (ES6 Modules), Fetch API, [Chart.js](https://www.chartjs.org/)
- **Backend**: Node.js, Express.js (REST API architecture)
- **Database**: MongoDB with Mongoose ODM
- **Sessions & Auth**: `express-session`, `connect-mongo`, `bcryptjs`
- **Database GUI**: MongoDB Compass

---

## ⚙️ Installation & Setup (Beginner Friendly)

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended; v24 verified)
- **MongoDB** (running locally on port 27017 or a MongoDB Atlas URI)
- **MongoDB Compass** (Desktop GUI)

### 2. Configure Environment Variables
Inside the `backend/` directory, verify that `.env` is configured (a template is provided in `backend/.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/spendwise
SESSION_SECRET=spendwise_super_secret_session_key_2026
CLIENT_ORIGIN=http://localhost:5000
```

### 3. Install Dependencies
Open your terminal in the project root and run:
```bash
cd backend
npm install
```

---

## 💻 Running the Application

From the project root folder, start the server:
```bash
npm start
```
*(Or for development with auto-reload: `npm run dev`)*

The server will display:
```text
[SpendWise Server] Running on http://localhost:5000
[MongoDB Connected] Host: 127.0.0.1 | Database: spendwise
```

Open your browser and navigate to:
👉 **`http://localhost:5000`**

- If you are not signed in, you will be redirected to `login.html`.
- Click **Create an account** (`signup.html`) to register your account.
- Once signed in, you will land directly in your fintech dashboard!

---

## 🔍 How to Inspect Stored Data in MongoDB Compass

MongoDB Compass is the official desktop graphical tool for MongoDB. It allows you to inspect your database without writing commands:

1. Open **MongoDB Compass** on your computer.
2. In the connection bar, enter:
   ```text
   mongodb://localhost:27017
   ```
3. Click **Connect**.
4. In the left navigation list, locate the **`spendwise`** database.
5. Inside `spendwise`, you will see five collections:
   - **`users`**: User records, hashed passwords (`passwordHash`), display currency, and registration dates.
   - **`transactions`**: All individual income and expense records scoped by `userId`.
   - **`budgets`**: Monthly category limits.
   - **`savingsgoals`**: Savings targets, current saved amounts, and target dates.
   - **`sessions`**: Active encrypted user sessions managed by `connect-mongo`.
6. Click any collection to view, search, or filter documents in real time as you interact with SpendWise!

---

## 📡 REST API Reference

All protected endpoints require an active session cookie established via login.

### Authentication & Profile
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user & start session |
| `POST` | `/api/auth/logout` | Invalidate session & clear cookie |
| `GET` | `/api/auth/me` | Fetch authenticated user details |
| `PUT` | `/api/profile` | Update display name and currency |
| `PUT` | `/api/profile/password` | Change password with current password verification |

### Transactions
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Query transactions (search, filter, sort, paginate) |
| `GET` | `/api/transactions/:id` | Fetch single transaction |
| `POST` | `/api/transactions` | Create income or expense record |
| `PUT` | `/api/transactions/:id` | Update existing transaction |
| `DELETE` | `/api/transactions/:id` | Delete transaction |

### Budgets
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/budgets?month=&year=` | Get monthly budgets with calculated real-time spent |
| `POST` | `/api/budgets` | Create or update budget limit |
| `PUT` | `/api/budgets/:id` | Edit budget |
| `DELETE` | `/api/budgets/:id` | Delete budget |

### Savings Goals
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/goals` | List user savings goals with virtual progress % |
| `POST` | `/api/goals` | Create a new savings goal |
| `PUT` | `/api/goals/:id` | Update goal or deposit funds (`depositAmount`) |
| `DELETE` | `/api/goals/:id` | Delete savings goal |

### Dashboard & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary?period=1M` | 4 top summary cards (Balance, Income, Spent, Savings Rate) |
| `GET` | `/api/dashboard/cashflow?period=1M` | Dual-line timeline dataset for Chart.js |
| `GET` | `/api/dashboard/spending?period=1M` | Category doughnut dataset & percentages |
| `GET` | `/api/analytics/overview` | 6-month historical trajectory & top category |
| `GET` | `/api/analytics/categories` | Complete category metric breakdown |

---

## 🧪 Automated Testing

SpendWise includes built-in test suites:

```bash
# Test 1: Verify MongoDB connection & schema validation
node backend/test-db.js

# Test 2: Master End-to-End suite (verifies all 21 files, auth, CRUD, isolations & calculations)
node backend/test-e2e.js
```

---

## 📄 License
This project is licensed under the ISC License.
