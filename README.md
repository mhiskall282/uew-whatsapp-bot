
## 🏫 WhatsApp AI Campus Guide – System Architecture

This project is a **WhatsApp-based AI assistant** designed to help students (especially freshers) navigate the **University of Education, Winneba (UEW)** campus, find locations, access campus information, and receive real-time guidance directly via WhatsApp.

The system integrates **Meta’s WhatsApp Cloud API**, a **Node.js backend**, AI services, and multiple data stores to deliver fast, context-aware responses.

---

## 📐 High-Level Architecture Diagram

```

┌─────────────┐
│  WhatsApp   │
│   Users     │
└──────┬──────┘
│
▼
┌─────────────────────────────────────┐
│   WhatsApp Cloud API (Meta)          │
│   - Receives messages                │
│   - Sends responses                  │
└──────┬──────────────────────────────┘
│ Webhook
▼
┌─────────────────────────────────────┐
│   Node.js Backend (Express)          │
│   ├─ Message Handler                 │
│   ├─ Intent Classifier               │
│   ├─ Navigation Service              │
│   ├─ Knowledge Base Service          │
│   ├─ Credit Manager                  │
│   └─ Feedback Handler                │
└──────┬──────────────────────────────┘
│
├──────────────┬─────────────────┬──────────────┐
▼              ▼                 ▼              ▼
┌──────────┐   ┌──────────┐     ┌──────────┐   ┌──────────┐
│PostgreSQL│   │  Redis   │     │ Pinecone │   │ Gemini   │
│  Users   │   │  Cache   │     │  Vector  │   │   API    │
│  Credits │   │ Sessions │     │   Store  │   │          │
│ Feedback │   │          │     │          │   │          │
└──────────┘   └──────────┘     └──────────┘   └──────────┘

```

---

## 🧩 Core Components

### 1️⃣ WhatsApp Cloud API (Meta)
- Acts as the communication layer between users and the system  
- Receives incoming WhatsApp messages  
- Sends AI-generated responses back to users  
- Forwards messages to the backend via **webhooks**

---

### 2️⃣ Node.js Backend (Express)
This is the **core brain** of the system.

**Key Services:**
- **Message Handler** – Parses incoming messages
- **Intent Classifier** – Detects user intent (navigation, info, feedback, etc.)
- **Navigation Service** – Generates directions and Google Maps links
- **Knowledge Base Service** – Fetches UEW-related information
- **Credit Manager** – Manages user credits as a usage/payment model
- **Feedback Handler** – Collects and stores user feedback

---

### 3️⃣ PostgreSQL (Persistent Storage)
Stores long-term structured data:
- User profiles
- Credit balances
- Feedback submissions
- Interaction history (optional)

---

### 4️⃣ Redis (Caching & Sessions)
Used for:
- Short-lived user sessions
- Conversation context
- Rate limiting
- Faster response times

---

### 5️⃣ Pinecone (Vector Database)
- Stores embedded campus knowledge (locations, FAQs, website data)
- Enables semantic search for accurate responses
- Used in Retrieval-Augmented Generation (RAG)

---

### 6️⃣ Gemini API (AI Engine)
- Handles natural language understanding
- Generates conversational responses
- Rephrases answers for clarity
- Works with Pinecone for context-aware replies

---

## 🔁 Request Flow Summary

1. User sends a message via WhatsApp  
2. WhatsApp Cloud API forwards the message to the backend webhook  
3. Backend classifies intent and fetches required data  
4. AI (Gemini) generates a response using contextual knowledge  
5. Response is sent back to the user via WhatsApp  

---

## 🚀 Why This Architecture?
- **Scalable** – Can support thousands of users
- **Fast** – Redis caching reduces response latency
- **AI-Powered** – Uses RAG for accurate campus knowledge
- **Monetizable** – Credit-based usage system
- **Production-Ready** – Suitable for real-world deployment

---

## 📌 Future Enhancements
- Admin dashboard (React) for content & analytics
- Voice message support
- Multi-campus support
- Offline-friendly fallback responses
- Integration with UEW official announcements

---


