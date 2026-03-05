# Quick Setup Guide: Lambda Integration

## Prerequisites

- Node.js 18+ installed
- Lambda function deployed with API Gateway
- Modern browser (Chrome/Edge recommended for voice)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Lambda API URL:

```env
VITE_LAMBDA_API_URL=https://your-api-gateway-url.amazonaws.com/prod
```

**How to get Lambda API URL:**
1. Go to AWS Console → API Gateway
2. Find your API
3. Copy the Invoke URL
4. Paste in `.env` file

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 4. Test the Integration

#### Test Text Input:
1. Click "टाइप करें" (Type) button
2. Type: "What schemes are available for wheat farmers?"
3. Click Send
4. Verify response appears with audio button

#### Test Voice Input:
1. Click "बोलें" (Speak) button
2. Allow microphone permission
3. Speak: "गेहूं के किसानों के लिए क्या योजनाएं हैं?"
4. Wait for recognition to complete
5. Verify text is sent and response received

### 5. Verify Features

- [ ] Text messages send successfully
- [ ] Voice recognition converts speech to text
- [ ] Lambda responses display correctly
- [ ] Audio playback works
- [ ] Metadata shows (click "विवरण देखें")
- [ ] Error handling works (try without internet)

## Troubleshooting

### Voice not working?

```bash
# Check browser support
# Open browser console and run:
console.log('webkitSpeechRecognition' in window)
# Should return: true
```

**Fix:** Use Chrome or Edge browser

### Lambda not responding?

```bash
# Test Lambda directly with curl
curl -X POST https://your-lambda-url \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
```

**Expected:** JSON response with statusCode 200

### CORS errors?

**Fix:** Configure API Gateway CORS:
- Allow origin: `http://localhost:5173`
- Allow methods: `POST, OPTIONS`
- Allow headers: `Content-Type`

### Audio not playing?

**Check:**
1. Lambda response includes `audio_base64` field
2. Browser console for errors
3. Audio format is MP3
4. Browser can play MP3 files

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_LAMBDA_API_URL` | Yes | Lambda API Gateway URL | `https://abc123.execute-api.us-east-1.amazonaws.com/prod` |
| `VITE_API_BASE_URL` | No | Legacy API URL (for auth) | `https://api.example.com` |

## File Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── lambda.ts          # Lambda API service
│   │   └── apiClient.ts       # Legacy API client
│   ├── types/
│   │   └── lambda.ts          # TypeScript interfaces
│   ├── pages/
│   │   └── ChatPage.tsx       # Main chat interface
│   ├── components/
│   │   └── Chat/
│   │       └── MessageBubble.tsx  # Message display
│   └── context/
│       └── ChatContext.tsx    # Chat state management
├── .env                       # Your configuration
├── .env.example              # Template
└── LAMBDA_INTEGRATION.md     # Full documentation
```

## Next Steps

1. **Deploy to production:**
   - Update `.env` with production Lambda URL
   - Build: `npm run build`
   - Deploy `dist/` folder

2. **Customize:**
   - Change voice recognition language in `ChatPage.tsx`
   - Modify UI colors/text
   - Add more metadata fields

3. **Monitor:**
   - Check browser console for errors
   - Monitor Lambda CloudWatch logs
   - Track API Gateway metrics

## Common Issues

### Issue: "Lambda API URL not configured"

**Cause:** `.env` file missing or `VITE_LAMBDA_API_URL` not set

**Fix:**
```bash
echo "VITE_LAMBDA_API_URL=https://your-url" >> frontend/.env
```

### Issue: Voice recognition stops immediately

**Cause:** Microphone permission denied or no speech detected

**Fix:**
- Grant microphone permission
- Speak clearly and continuously
- Check microphone is working

### Issue: Response takes too long

**Cause:** Lambda cold start or slow processing

**Fix:**
- Wait for first request (cold start)
- Subsequent requests will be faster
- Consider Lambda provisioned concurrency

## Support

Need help? Check:
1. Browser console for errors
2. Network tab for API calls
3. Lambda CloudWatch logs
4. `LAMBDA_INTEGRATION.md` for detailed docs

## Quick Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint
npm run lint
```

## Success Checklist

- [x] Dependencies installed
- [x] `.env` file created with Lambda URL
- [x] Dev server running
- [x] Text messages working
- [x] Voice recognition working
- [x] Audio playback working
- [x] Metadata displaying
- [x] Error handling tested

You're all set! 🎉
