┌─────────────┐
│  WhatsApp   │
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│   WhatsApp Cloud API (Meta)         │
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
