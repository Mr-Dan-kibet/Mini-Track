# **Mini-Track – School Minibus Booking & Tracking System**

Mini-Track is a web-based transportation management platform designed to improve the safety, reliability, and efficiency of school commutes. The system enables parents to book minibus seats for their children, view transport routes, and monitor trips, while providing administrators and operators with structured management tools.

---

## ** Project Overview**

In many developing regions, access to safe and dependable school transportation remains inconsistent. Students often walk long distances under unsafe or unpredictable conditions, while transport providers rely on manual coordination.

Mini-Track addresses these challenges by digitizing:

* Seat booking and reservation
* Route visibility and selection
* Transport management workflows
* Trip monitoring and updates

---

## ** Objectives**

The system aims to:

* Improve student commute safety
* Provide transport transparency for families
* Streamline booking and route management
* Reduce manual coordination inefficiencies
* Offer a scalable digital transport solution

---

## ** Core Features (MVP Scope)**

The Minimum Viable Product (MVP) focuses on essential functionality:

### **1. Authentication**

* User registration & login
* Secure session management

### **2. Route Selection**

* View available routes
* Choose pickup locations

### **3. Booking System**

* Reserve seats
* Validate availability
* Confirm bookings

### **4. Admin Dashboard**

* Manage routes and vehicles
* Monitor bookings
* Control system data

### **5. Parent Dashboard**

* Monitor bookings
* Track trips in real time

### **6. Driver Dashboard**

* View assigned routes
* Manage pickups and update trip status

---

## ** System Architecture**

Mini-Track follows a decoupled frontend-backend architecture:

```
Frontend (Next.js)
    ↓ REST API Calls
Backend (Flask API)
    ↓ ORM / Queries
PostgreSQL Database
```

### **Frontend**

* Next.js (App Router)
* Tailwind CSS
* Map integration (Google Maps / Leaflet)

### **Backend**

* Flask REST API
* PostgreSQL Database
* ORM (SQLAlchemy)

---

## **Technology Stack**

### **Frontend**

* Next.js
* Tailwind CSS
* Leaflet.js

### **Backend**

* Flask (REST API)
* PostgreSQL

### **Deployment**

* Frontend: Vercel
* Backend: Render
* Database: Railway

---

## ** Installation & Setup**

### **1. Clone Repository**

```bash
git clone <repository-url>
cd Mini-Track
```

---

### **2. Frontend Setup**

```bash
cd frontend/client
npm install
npm run dev
```

Runs development server at:

```
http://localhost:3000
```

---

### **3. Backend Setup**

```bash
cd backend
pip install -r requirements.txt
flask run
```

Runs API server at:

```
http://127.0.0.1:5555
```

---

### **4. Database Configuration**

Ensure PostgreSQL is running and configure environment variables:

```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

Run migrations if applicable.

---

## ** Environment Variables**

Example frontend `.env.local`:

```
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:5555
```

Example backend `.env`:

```
DATABASE_URL=postgresql://...
SECRET_KEY=your_secret
```

---

## ** System Workflow**

1. User registers / logs in
2. Parent views available routes
3. Parent selects pickup location
4. Seat booking is submitted
5. Backend validates capacity
6. Booking stored in database
7. Driver views their scheduled trips
8. Admin manages routes / vehicles

---

## ** Branching Strategy**

Recommended:

```
main → stable production code
dev → integration branch
feature/<name> → individual features
```

Example:

```
feature/booking-system
feature/admin-dashboard
feature/authentication
```

---

## ** Testing Considerations**

Key areas for validation:

* Authentication flows
* Booking logic & constraints
* Route selection
* API responses
* Error handling

---

## **Known Constraints (MVP)**

* Loging in/ signing up
* Route selection
* Booking system
* Parent dashboard
* Driver dashboard
* Admin dashboard

---

## **Future Enhancements**

Potential system expansions:

* Real time GPS tracking
* Payments integration
* Subscription based booking


---

## **Project Team**

Developed by a team of five web developers as part of an academic project.
They include: 
* Fortune Ngili
* Dan Rotich
* Roy Cheruiyot
* Kibet Chumo
* Heeba Hassan

---

# **Live Link**
https://mini-track-two.vercel.app/





