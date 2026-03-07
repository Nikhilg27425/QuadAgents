# QuadAgents (कृषि सहायक - Krishi Sahaayak)

🌾 An AI-powered agricultural assistant for Indian farmers, providing personalized farming guidance in Hindi through voice and text interactions.

## 🚀 Live Demo

**Deployed Application:** [https://quad-agents.vercel.app](https://quad-agents.vercel.app)

## 📋 Overview

QuadAgents is a comprehensive agricultural support system designed specifically for Indian farmers. The application combines modern AI technology with local agricultural knowledge to provide:

- **Voice-based interactions** in Hindi for accessibility
- **Personalized farming advice** based on user profiles
- **Government scheme information** and eligibility guidance
- **RAG (Retrieval-Augmented Generation)** for accurate, context-aware responses
- **Text-to-Speech** output using Amazon Polly for audio responses

## ✨ Key Features

### 🎤 Voice & Text Input
- Web Speech API for voice input in Hindi
- Text input support for typing queries
- Real-time speech recognition

### 🔊 Audio Responses
- Amazon Polly TTS with Hindi voice (Aditi)
- Playback controls for audio responses
- Text display alongside audio

### 👤 User Profiling
- Onboarding flow to collect farmer information
- Profile-based personalized recommendations
- Session persistence across conversations

### 🔐 Secure Authentication
- AWS Cognito integration
- JWT token-based authentication
- Automatic token expiration handling

### 💬 Smart Chat Interface
- Context-aware conversations
- Session management
- Message history
- Metadata display (similarity scores, response times)

## 🏗️ Architecture

### Frontend
- **Framework:** React + TypeScript + Vite
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Deployment:** Vercel

### Backend
- **Compute:** AWS Lambda (Python 3.12)
- **API Gateway:** AWS API Gateway with Cognito authorizer
- **Database:** Amazon DynamoDB
  - `KrishiVectors`: Document embeddings for RAG
  - `KrishiSessions`: User session data
- **AI/ML:**
  - Amazon Bedrock (Nova Lite model) for text generation
  - Amazon Titan Embeddings for vector search
  - Amazon Polly for text-to-speech
- **Authentication:** AWS Cognito User Pool

### Data Flow
```
User → Frontend (React) → API Gateway (Cognito Auth) → Lambda Function
                                                            ↓
                                    ┌──────────────────────┴──────────────────────┐
                                    ↓                      ↓                      ↓
                              DynamoDB              Bedrock (Nova)          Polly (TTS)
                           (Vectors/Sessions)    (RAG + Generation)      (Audio Output)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- AWS Account with configured services
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nikhilg27425/QuadAgents.git
   cd QuadAgents
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_LAMBDA_API_URL=https://your-api-gateway-url.amazonaws.com/prod/ask
   VITE_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
   VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_AWS_REGION=ap-south-1
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:8080`

## 📱 How to Use

### For New Users

1. **Access the Application**
   - Visit [https://quad-agents.vercel.app](https://quad-agents.vercel.app)
   - Click "लॉगिन करें" (Login) button

2. **Sign Up / Login**
   - You'll be redirected to the Cognito hosted UI
   - Sign in with your credentials or create a new account
   - After authentication, you'll be redirected to the dashboard

3. **Complete Onboarding**
   - On first use, answer 5 profile questions:
     - Your state (राज्य)
     - Land size (ज़मीन का आकार)
     - Crops grown (फसल)
     - Farmer type (किसान का प्रकार)
     - Irrigation method (सिंचाई का तरीका)

4. **Start Chatting**
   - Navigate to the Chat page (चैट)
   - Use the microphone button for voice input or type your question
   - Receive personalized farming advice with audio responses
   - Click "सुनें" (Listen) to play audio responses

### Features Available

- **Dashboard:** Overview and quick access
- **Chat:** AI-powered farming assistant
- **Profile:** View and update your information
- **Notifications:** Stay updated with important alerts

## 🛠️ Development

### Project Structure
```
QuadAgents/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── api/             # API clients (Lambda, Auth)
│   │   ├── components/      # React components
│   │   ├── context/         # Context providers
│   │   ├── pages/           # Page components
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   └── package.json
│
├── lambda_function/         # AWS Lambda backend
│   ├── lambda_function.py   # Main Lambda handler
│   ├── validation.py        # Input validation
│   └── requirements.txt     # Python dependencies
│
└── README.md
```

### Running Tests
```bash
cd frontend
npm run test
```

### Building for Production
```bash
cd frontend
npm run build
```

## 🔧 AWS Services Configuration

### Required AWS Services
1. **AWS Cognito User Pool** - User authentication
2. **AWS Lambda** - Backend compute
3. **Amazon API Gateway** - REST API with Cognito authorizer
4. **Amazon DynamoDB** - Data storage (2 tables)
5. **Amazon Bedrock** - AI model access (Nova Lite)
6. **Amazon Polly** - Text-to-speech

### Lambda Configuration
- **Runtime:** Python 3.12
- **Memory:** 512 MB (recommended)
- **Timeout:** 30 seconds
- **Environment Variables:** None required (uses IAM role)

### IAM Permissions Required
The Lambda execution role needs:
- `bedrock:InvokeModel` - For Nova and Titan models
- `polly:SynthesizeSpeech` - For TTS generation
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:Scan` - For database access

## 🌐 Deployment

### Frontend (Vercel)
The frontend is automatically deployed to Vercel on every push to the `main` branch.

### Backend (AWS Lambda)
Deploy the Lambda function using the AWS CLI or Console:
```bash
cd lambda_function
zip -r function.zip .
aws lambda update-function-code \
  --function-name KrishiRAGProcessor \
  --zip-file fileb://function.zip
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Nikhil Gupta - [@Nikhilg27425](https://github.com/Nikhilg27425)

## 🙏 Acknowledgments

- Built with AWS services for scalability and reliability
- UI components from shadcn/ui
- Icons from Lucide React
- Designed for Indian farmers with accessibility in mind