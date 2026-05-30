# ☕ CaféSync - Intelligent F&B Ecosystem

**Topic:** Operational Optimization & Customer Experience Personalization System for Coffee Shops.

---

## 📖 Project Overview

**CaféSync** is a modern F&B ecosystem built on the **MERN Stack**. The project bridges the gap between customers and coffee shop operations through a **Premium Mobile-First Soft UI**, a **Smart Context-Aware Personalization Engine**, and a virtual assistant **Syncie AI** (leveraging Groq Llama 3.1). It automates and modernizes daily coffee shop operations while providing a highly tailored ordering experience for customers.

---

## ✨ Core Features

### 1. Customer Ordering App (`frontend-client`)
* **Context-Aware Recommendations**: 
  - **"My Favorites" (Món tủ của bạn)**: Learns from completed order history to suggest a customer's most frequently ordered drinks.
  - **"Try Something New?" (Thử chút vị mới?)**: Suggests products from the customer's favorite category that they have *not* purchased yet.
  - **Time-based Prompts**: Recommends appropriate drinks based on the time of day (e.g., energizing Coffee in the morning, refreshing Tea/Smoothies in the afternoon, or healthy Juices in the evening).
* **Beverage Preference Memory (Habits)**: Remembers the customer's size, sugar, ice, and topping choices from their last order, automatically pre-selecting them and highlighting choices with a clean, dashed gold border.
* **Syncie AI Assistant**: Powered by **Groq Cloud (Llama 3.1)**, it is highly trained on the shop's menu to guide customers, take notes, and suggest custom beverage choices.
* **Real-time Order Tracking & Receipts**: Fully transparent tracking showing order steps (Received, In Prep, Completed) along with detailed choices (size, sugar, ice, toppings, and notes).
* **Payment Integration**: Supports online payment via **PayOS** QR codes with automatic real-time transaction reconciliation.

### 2. Shop Management Dashboard (`frontend-admin`)
* **POS & Order Management**: Real-time incoming order dashboard with audio/socket alerts, order status updates, and printing.
* **Inventory Control & Menu Management**: Edit ingredients, menu items, prices, toppings, categories, and track stock usage.
* **Table & QR Management**: Associate tables with custom QR codes that automatically parse table numbers in the customer app.
* **Operational Reporting**: Generates sales charts, order counts, revenue statistics, and ingredient usage reports.

---

## 🚀 Technology Stack

* **Frontend**: React.js, Vite, Bootstrap 5, CSS3 (Vanilla Custom Properties & Keyframes for animations), Socket.io-client.
* **Backend**: Node.js, Express.js, Socket.io, Mongoose (MongoDB Atlas).
* **Integrations & AI**:
  - **AI Model**: Groq Cloud SDK (Llama 3.1-70b-versatile).
  - **Payment Gateways**: PayOS API & Webhook verification.
  - **Authentication**: JWT (JSON Web Tokens), Google OAuth, Facebook Login.

---

## 📂 Project Structure (Monorepo)

* `📁 frontend-client/` - React frontend application for customer ordering, tracking, and chatbot interaction.
* `📁 frontend-admin/` - Operational dashboard for shop managers (POS, inventory, reports, QR codes).
* `📁 Backend_API/` - Central Node.js API server handling data modeling, AI chatbot endpoints, socket signals, and PayOS hooks.

---

## 🛠️ Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+)
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and database instance.

### 1. Backend Server Configuration
1. Navigate to the API folder:
   ```bash
   cd Backend_API
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Backend_API` root and configure the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=your_groq_api_key
   PAYOS_CLIENT_ID=your_payos_client_id
   PAYOS_API_KEY=your_payos_api_key
   PAYOS_CHECKSUM_KEY=your_payos_checksum_key
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Client Setup
1. Navigate to the client folder:
   ```bash
   cd ../frontend-client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the client development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Admin Setup
1. Navigate to the admin folder:
   ```bash
   cd ../frontend-admin
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the admin development server:
   ```bash
   npm run dev
   ```

---

## 👥 Development Team (Fullstack Team)

This system was developed by Information Systems students at the **Industrial University of Ho Chi Minh City (IUH)**:

1. **Ly Thi Yen** (Fullstack Developer)
   * *Responsibilities*: Front-to-Back development of the Client module. Co-designed the RESTful API server, MongoDB schema mapping, real-time Socket.io notifications, and PayOS payment webhooks. Developed the Premium Soft UI design, Cart/Favorite state logic, and Syncie AI assistant integration.
2. **Nguyen Van Tai** (Fullstack Developer)
   * *Responsibilities*: Front-to-Back development of the Admin Management POS module. Co-designed the backend server architecture, MongoDB configuration, Socket.io event-driven infrastructure. Developed the inventory tracking, business reports, and table QR code management logic.

---
*© 2026 CaféSync Project - Industrial University of Ho Chi Minh City.*