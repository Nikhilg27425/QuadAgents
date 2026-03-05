# Lambda Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend                              │
│                     (QuadAgents/KrishiSahaayak)                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            ChatPage.tsx                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  User Input Layer                                             │ │
│  │  ┌──────────────┐              ┌──────────────┐              │ │
│  │  │ Text Input   │              │ Voice Input  │              │ │
│  │  │ (Textarea)   │              │ (Web Speech) │              │ │
│  │  └──────┬───────┘              └──────┬───────┘              │ │
│  │         │                              │                      │ │
│  │         └──────────────┬───────────────┘                      │ │
│  │                        │                                      │ │
│  │                        ▼                                      │ │
│  │              ┌──────────────────┐                            │ │
│  │              │ sendTextMessage  │                            │ │
│  │              └────────┬─────────┘                            │ │
│  └───────────────────────┼──────────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Lambda API Service                             │
│                        (lambda.ts)                                  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  askLambda(question: string)                                 │ │
│  │    │                                                          │ │
│  │    ├─► Validate input                                        │ │
│  │    ├─► Create request: { question }                          │ │
│  │    ├─► POST to Lambda API                                    │ │
│  │    ├─► Parse response                                        │ │
│  │    └─► Convert base64 audio → Blob URL                       │ │
│  │                                                               │ │
│  └───────────────────────┬───────────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS Lambda Function                            │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  1. Language Detection                                        │ │
│  │  2. Intent Classification                                     │ │
│  │  3. RAG System (Vector Search)                                │ │
│  │  4. Answer Generation                                         │ │
│  │  5. Text-to-Speech (Polly)                                    │ │
│  └───────────────────────┬───────────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Response Processing                            │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  {                                                            │ │
│  │    statusCode: 200,                                           │ │
│  │    body: {                                                    │ │
│  │      detected_language: "Hindi",                              │ │
│  │      intent: "scheme_discovery",                              │ │
│  │      farmer_profile: {...},                                   │ │
│  │      similarity_score: 0.85,                                  │ │
│  │      answer: "...",                                           │ │
│  │      audio_base64: "..."                                      │ │
│  │    }                                                          │ │
│  │  }                                                            │ │
│  └───────────────────────┬───────────────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Message Display                                │
│                    (MessageBubble.tsx)                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  Answer Text (Immediate Display)                        │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  🔊 Audio Playback Button                               │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  ℹ️ Metadata (Collapsible)                              │ │ │
│  │  │    - Language: Hindi                                    │ │ │
│  │  │    - Intent: scheme_discovery                           │ │ │
│  │  │    - Similarity: 85%                                    │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────┐
│   User   │
└────┬─────┘
     │
     │ 1. Speaks/Types
     ▼
┌─────────────────┐
│  Web Speech API │ (Browser)
│  Speech → Text  │
└────┬────────────┘
     │
     │ 2. Text Question
     ▼
┌─────────────────┐
│  Lambda Service │ (lambda.ts)
│  askLambda()    │
└────┬────────────┘
     │
     │ 3. HTTP POST
     │    { question: "..." }
     ▼
┌─────────────────┐
│  API Gateway    │ (AWS)
└────┬────────────┘
     │
     │ 4. Invoke
     ▼
┌─────────────────┐
│ Lambda Function │ (Python)
│  - Detect Lang  │
│  - Classify     │
│  - RAG Search   │
│  - Generate     │
│  - TTS (Polly)  │
└────┬────────────┘
     │
     │ 5. Response
     │    { answer, audio_base64, metadata }
     ▼
┌─────────────────┐
│  Lambda Service │ (lambda.ts)
│  - Parse        │
│  - Convert B64  │
└────┬────────────┘
     │
     │ 6. Message Object
     │    { text, audioUrl, metadata }
     ▼
┌─────────────────┐
│  ChatContext    │
│  addMessage()   │
└────┬────────────┘
     │
     │ 7. Render
     ▼
┌─────────────────┐
│ MessageBubble   │
│  - Show Text    │
│  - Play Audio   │
│  - Show Meta    │
└────┬────────────┘
     │
     │ 8. Display
     ▼
┌──────────┐
│   User   │
└──────────┘
```

## File Structure

```
frontend/
├── src/
│   ├── types/
│   │   └── lambda.ts                 # TypeScript Interfaces
│   │       ├── LambdaRequest
│   │       ├── LambdaResponse
│   │       ├── LambdaResponseBody
│   │       ├── FarmerProfile
│   │       └── Message (enhanced)
│   │
│   ├── api/
│   │   ├── lambda.ts                 # Lambda API Service
│   │   │   ├── askLambda()
│   │   │   ├── base64ToAudioUrl()
│   │   │   └── checkLambdaHealth()
│   │   │
│   │   └── __tests__/
│   │       └── lambda.test.ts        # Unit Tests
│   │
│   ├── pages/
│   │   └── ChatPage.tsx              # Main Chat Interface
│   │       ├── Web Speech API
│   │       ├── Voice Recognition
│   │       ├── Text Input
│   │       └── Lambda Integration
│   │
│   ├── components/
│   │   └── Chat/
│   │       └── MessageBubble.tsx     # Message Display
│   │           ├── Text Display
│   │           ├── Audio Playback
│   │           └── Metadata Toggle
│   │
│   └── context/
│       └── ChatContext.tsx           # State Management
│           └── Message[] state
│
├── .env                              # Configuration
│   └── VITE_LAMBDA_API_URL
│
└── Documentation/
    ├── LAMBDA_INTEGRATION.md         # Full Guide
    ├── SETUP_LAMBDA.md               # Quick Setup
    ├── INTEGRATION_CHANGES.md        # Changes Detail
    ├── LAMBDA_INTEGRATION_SUMMARY.md # Summary
    └── ARCHITECTURE_DIAGRAM.md       # This File
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                      ChatContext                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  State:                                               │ │
│  │    - messages: Message[]                              │ │
│  │    - loading: boolean                                 │ │
│  │    - sessionId: string                                │ │
│  │    - lowBandwidthMode: boolean                        │ │
│  │                                                        │ │
│  │  Actions:                                             │ │
│  │    - addMessage(msg: Message)                         │ │
│  │    - setLoading(loading: boolean)                     │ │
│  │    - setLowBandwidthMode(mode: boolean)               │ │
│  │    - clearChat()                                      │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Message Object Structure

```typescript
interface Message {
  id: string;                    // Unique identifier
  sender: "user" | "bot";        // Message sender
  text: string;                  // Message content
  timestamp: number;             // Unix timestamp
  audioUrl?: string;             // Blob URL for audio
  metadata?: {                   // Lambda response metadata
    language?: string;           // Detected language
    intent?: string;             // Classified intent
    similarityScore?: number;    // RAG similarity (0-1)
    farmerProfile?: {            // Farmer context
      land_size?: string;
      crops?: string[];
      location?: string;
      [key: string]: any;
    };
  };
}
```

## API Request/Response Flow

```
Request:
┌─────────────────────────────────────┐
│ POST {LAMBDA_API_URL}               │
│ Content-Type: application/json      │
│                                     │
│ {                                   │
│   "question": "user's question"     │
│ }                                   │
└─────────────────────────────────────┘

Response:
┌─────────────────────────────────────┐
│ {                                   │
│   "statusCode": 200,                │
│   "body": {                         │
│     "detected_language": "Hindi",   │
│     "intent": "scheme_discovery",   │
│     "farmer_profile": {             │
│       "land_size": "2 acres",       │
│       "crops": ["wheat"],           │
│       "location": "Punjab"          │
│     },                              │
│     "similarity_score": 0.8542,     │
│     "answer": "Answer text...",     │
│     "audio_base64": "base64..."     │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
```

## Voice Recognition Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Voice Input Process                       │
└──────────────────────────────────────────────────────────────┘

1. User clicks "बोलें" button
   │
   ▼
2. Initialize Web Speech API
   recognitionRef.current = new SpeechRecognition()
   recognitionRef.current.lang = 'hi-IN'
   │
   ▼
3. Start listening
   recognitionRef.current.start()
   setIsListening(true)
   │
   ▼
4. Real-time transcript
   onresult: setTranscript(text)
   Display transcript to user
   │
   ▼
5. Speech ends (final result)
   isFinal = true
   setIsListening(false)
   │
   ▼
6. Send text to Lambda
   sendTextMessage(transcript)
   │
   ▼
7. Display response
   Show answer + audio + metadata
```

## Audio Processing Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   Audio Response Process                     │
└──────────────────────────────────────────────────────────────┘

1. Lambda returns base64 audio
   audio_base64: "//uQxAAAAAAA..."
   │
   ▼
2. Convert to binary
   const binaryString = atob(base64Data)
   const bytes = new Uint8Array(...)
   │
   ▼
3. Create Blob
   const blob = new Blob([bytes], { type: "audio/mpeg" })
   │
   ▼
4. Generate Blob URL
   const audioUrl = URL.createObjectURL(blob)
   │
   ▼
5. Store in message
   message.audioUrl = audioUrl
   │
   ▼
6. User clicks play
   const audio = new Audio(audioUrl)
   audio.play()
   │
   ▼
7. Cleanup (optional)
   URL.revokeObjectURL(audioUrl)
```

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Error Handling                           │
└──────────────────────────────────────────────────────────────┘

Try:
  ├─► askLambda(question)
  │   ├─► Validate input
  │   ├─► POST request
  │   └─► Parse response
  │
Catch:
  ├─► Network Error
  │   └─► "No response from Lambda API"
  │
  ├─► Lambda Error (statusCode != 200)
  │   └─► "Lambda returned status {code}"
  │
  ├─► Timeout Error
  │   └─► "Request timeout after 30s"
  │
  └─► Other Errors
      └─► Display error message
      └─► Add fallback bot message
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                      Component Tree                         │
└─────────────────────────────────────────────────────────────┘

App
 └─► ChatProvider (Context)
      └─► ChatPage
           ├─► Input Section
           │    ├─► Text Input (Textarea)
           │    └─► Voice Button (Web Speech)
           │
           ├─► Messages Section
           │    └─► MessageBubble (for each message)
           │         ├─► Text Display
           │         ├─► Audio Button
           │         └─► Metadata Toggle
           │
           └─► Status Section
                ├─► Loading Indicator
                ├─► Error Display
                └─► Low Bandwidth Toggle
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Stack                           │
└─────────────────────────────────────────────────────────────┘

Framework:        React 18 + TypeScript
Build Tool:       Vite
Styling:          Tailwind CSS
HTTP Client:      Axios
State:            React Context API
Voice Input:      Web Speech API (Browser Native)
Audio:            HTML5 Audio API
Testing:          Vitest + Testing Library

┌─────────────────────────────────────────────────────────────┐
│                    Backend Stack                            │
└─────────────────────────────────────────────────────────────┘

Compute:          AWS Lambda (Python)
API:              API Gateway
TTS:              Amazon Polly
Vector DB:        (Your RAG system)
Language:         Python 3.x
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Setup                         │
└─────────────────────────────────────────────────────────────┘

Frontend:
  ├─► Build: npm run build
  ├─► Output: dist/
  └─► Deploy: S3 + CloudFront / Vercel / Netlify

Backend:
  ├─► Lambda Function (Python)
  ├─► API Gateway (REST API)
  ├─► Polly (TTS)
  └─► Vector Database (RAG)

Configuration:
  └─► Environment Variables
       └─► VITE_LAMBDA_API_URL
```

---

This architecture provides:
- ✅ Separation of concerns
- ✅ Type safety with TypeScript
- ✅ Efficient voice processing (browser-based)
- ✅ Rich user experience with metadata
- ✅ Graceful error handling
- ✅ Scalable and maintainable code structure
