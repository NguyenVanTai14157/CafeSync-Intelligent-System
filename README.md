# ☕ CaféSync - Intelligent F&B Ecosystem

**Topic:** Operational Optimization & Customer Experience Personalization System for Coffee Shops.

---

## 📖 Project Overview

**CaféSync** is a coffee shop management and ordering system with **React web applications and a React Native mobile app**. Customers can browse drinks, customize orders, and track their status, while staff manage orders, products, and tables through the web dashboard.

The customer website, admin dashboard, and mobile app share an **Express REST API, Socket.IO server, and MongoDB database**. Mobile uses the same email/password accounts and order data as the website. The customer website also includes purchase-history recommendations and the **Syncie AI** menu assistant.

| Application | Purpose | Main technologies |
| --- | --- | --- |
| `frontend-client` | Customer ordering website | React, Vite |
| `frontend-admin` | Staff and manager dashboard | React, Vite |
| `mobile-client` | Native customer ordering app | React Native, Expo, TypeScript |
| `Backend_API` | Shared API, payments, and order events | Node.js, Express, MongoDB, Socket.IO |

For mobile setup and architecture, see the [mobile README](mobile-client/README.md). Automated checks are defined in [Mobile CI](.github/workflows/mobile-ci.yml).

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

### 3. Native Customer App (`mobile-client`)
* **Cross-platform Mobile Ordering**: Native Android/iOS customer experience built with Expo Router and TypeScript.
* **Server State Management**: TanStack Query caching, retry, refresh, and network-aware synchronization. Previously fetched public menu data is persisted for up to 24 hours; offline checkout is not implemented.
* **Real-time Tracking**: Socket.IO receives order status changes, with a 30-second REST refresh on the order detail screen until the order reaches a terminal status.
* **Local Storage**: JWT stored in SecureStore on Android/iOS; cart and favorites persisted separately with AsyncStorage. Personalized queries and order history are excluded from the persisted query cache.
* **Quality Pipeline**: Jest, React Native Testing Library, strict TypeScript, Expo bundle verification, and GitHub Actions.

---

## 🚀 Technology Stack

* **Frontend**: React.js, Vite, Bootstrap 5, CSS3 (Vanilla Custom Properties & Keyframes for animations), Socket.io-client.
* **Mobile**: React Native 0.86, Expo SDK 57, Expo Router, TypeScript 6, TanStack Query, Socket.IO, SecureStore, AsyncStorage.
* **Backend**: Node.js, Express.js, Socket.io, Mongoose (MongoDB Atlas).
* **Integrations & AI**:
  - **AI Model**: Groq Cloud SDK (`llama-3.1-8b-instant` in the current server configuration).
  - **Payment Gateways**: PayOS payment links and webhook handling.
  - **Authentication**: JWT and shared email/password accounts; Google/Facebook sign-in is currently a web flow.

---

## 📂 Project Structure (Monorepo)

* `📁 frontend-client/` - React frontend application for customer ordering, tracking, and chatbot interaction.
* `📁 frontend-admin/` - Operational dashboard for shop managers (POS, inventory, reports, QR codes).
* `📁 Backend_API/` - Central Node.js API server handling data modeling, AI chatbot endpoints, socket signals, and PayOS hooks.
* `📁 mobile-client/` - Expo/React Native customer app sharing the same API, accounts, products, orders, and payments.

---

## 🛠️ Installation & Setup

### Prerequisites
* Node.js 22.13.1 or a newer compatible Node.js 22 release for the mobile toolchain; Mobile CI uses 22.13.1.
* MongoDB connection and backend environment variables when running the API locally. Mobile uses the configured Render API by default.
* For mobile testing: Expo Go on a compatible phone, or Android Studio with a running Android emulator. A local iOS Simulator requires macOS and Xcode.

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

### 4. Mobile Client Setup
1. Install and start from the repository root:
   ```bash
   npm --prefix mobile-client ci
   npm run mobile
   ```
2. With the laptop and phone on the same reachable local network, scan the current QR code with Expo Go. Press `a` to open the app on a running Android emulator. Both can connect to the same Metro server.
3. Run lint, TypeScript checks, and unit/component tests from the repository root:
   ```bash
   npm run mobile:check
   ```

If your terminal is already inside `mobile-client`, use `npm start` to run the app
and `npm run check` for local checks. `npm run mobile` is a root-level script.

See [`mobile-client/README.md`](mobile-client/README.md) for API configuration,
architecture, realtime behavior, and EAS preview builds.

### Mobile Delivery Status

* Android has been exercised on an emulator and a physical phone during development. Android/iOS/Web JavaScript bundle exports have been checked locally; this does not establish iOS device or App Store validation.
* Mobile CI is configured to run lint, type checking, Jest tests, and bundle export for changes under `mobile-client`. Its actual results appear in GitHub Actions after a push or pull request.
* `eas.json` defines development, preview APK, and production build profiles. No downloadable APK or store release is included yet; building requires linking an Expo account and configuring signing credentials.
* PayOS currently returns to the website after payment. Mobile payment deep links, mobile social sign-in, push notifications, Sentry, and OTA updates are not implemented.
* Realtime status changes require the updated backend to be deployed. The mobile app and admin website must point to the same backend to observe the same orders.

---

## 👥 Development Team (Fullstack Team)

This system was developed by Information Systems students at the **Industrial University of Ho Chi Minh City (IUH)**:

1. **Ly Thi Yen** (Fullstack Developer)
   * *Responsibilities*: Front-to-Back development of the Client module. Co-designed the RESTful API server, MongoDB schema mapping, real-time Socket.io notifications, and PayOS payment webhooks. Developed the Premium Soft UI design, Cart/Favorite state logic, and Syncie AI assistant integration.
2. **Nguyen Van Tai** (Fullstack Developer)
   * *Responsibilities*: Front-to-Back development of the Admin Management POS module and React Native customer app. Co-designed the backend server architecture, MongoDB configuration, Socket.io event-driven infrastructure. Developed inventory tracking, business reports, table QR management, mobile ordering, secure session storage, query caching, and mobile CI.

---
*© 2026 CaféSync Project - Industrial University of Ho Chi Minh City.*
