# AIRDRAW - Project Setup & Architecture Guide

This document provides comprehensive setup instructions and architecture details for the AIRDRAW application.

## Project Overview

AIRDRAW is a secure, AI-powered gesture drawing application that combines:

- **Google MediaPipe Hand Landmarker** for real-time hand tracking
- **Google Gemini 2.5 Flash** for AI drawing analysis (via serverless functions)
- **React 19** with TypeScript for the frontend
- **Netlify Functions** for secure API key management

## Security Architecture

**IMPORTANT**: This project uses **Netlify Functions** to keep the Gemini API key secure. The API key is **NEVER exposed** to the client-side JavaScript.

### Architecture Flow

```text
Browser → Netlify Function → Gemini API
  (no API key)    (has API key)    (receives request)
```

### Why Serverless Functions?

- ✅ **API key stays server-side** - Never exposed in client JavaScript
- ✅ **Rate limiting** - Can implement per-user limits
- ✅ **Request validation** - Verify image data before sending to Gemini
- ✅ **Cost control** - Monitor and limit API usage
- ✅ **Production-ready** - Same architecture works locally and in production

## Environment Setup

### Prerequisites

- **Node.js**: v20 or higher (specified in `.nvmrc`)
- **Yarn**: v1.22 or higher (package manager)
- **Google Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Desktop device** with webcam
- **Modern browser**: Chrome, Firefox, Safari, or Edge

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/sambitcreate/aidraw.git
   cd airdraw-studio
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Create environment file**:

   Create `.env.local` in the project root:

   ```bash
   # .env.local
   # Server-side only - NOT exposed to client
   GEMINI_API_KEY=your_api_key_here
   ```

   **Note**: The variable is `GEMINI_API_KEY` (no `VITE_` prefix), which keeps it server-side only.

4. **Run development server**:

   ```bash
   yarn dev
   ```

   This starts **Netlify Dev** on `http://localhost:8888` which includes:
   - Vite dev server
   - Serverless functions
   - Environment variables
   - Full production simulation

## Project Structure

```text
airdraw-studio/
├── components/
│   ├── VideoCanvas.tsx          # Main canvas + MediaPipe integration
│   └── Toolbar.tsx              # UI controls (colors, brush, actions)
├── services/
│   └── geminiService.ts         # Calls Netlify Function (not Gemini directly)
├── netlify/
│   └── functions/
│       └── analyze-drawing.ts   # Serverless function with API key
├── App.tsx                      # Main application component
├── index.tsx                    # Application entry point
├── index.html                   # HTML template with Tailwind CSS CDN
├── types.ts                     # TypeScript types & constants
├── vite.config.ts               # Vite build configuration
├── tsconfig.json                # TypeScript configuration
├── netlify.toml                 # Netlify deployment + functions config
├── package.json                 # Dependencies & scripts
├── .env.local                   # Environment variables (NOT committed)
├── .gitignore                   # Excludes .env.local and sensitive files
├── .nvmrc                       # Node.js version (v20)
├── README.md                    # User-facing documentation
├── AGENTS.md                    # AI agents technical documentation
├── CLAUDE.md                    # This file - setup & architecture guide
└── GEMINI.md                    # Gemini API configuration reference
```

## Key Files Explained

### Serverless Function: `netlify/functions/analyze-drawing.ts`

This is where the **Gemini API key is used securely**:

```typescript
import { GoogleGenAI } from '@google/genai';

// Server-side only - process.env works in functions
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const handler: Handler = async (event) => {
  const { imageData } = JSON.parse(event.body || '{}');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { /* image + prompt */ }
  });

  return { statusCode: 200, body: JSON.stringify({ result: response.text }) };
};
```

### Client Service: `services/geminiService.ts`

Calls the serverless function (no API key needed):

```typescript
export const analyzeDrawing = async (base64Image: string): Promise<string> => {
  const response = await fetch('/.netlify/functions/analyze-drawing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData: base64Image }),
  });

  const data = await response.json();
  return data.result;
};
```

### Configuration: `netlify.toml`

Defines functions directory and local dev settings:

```toml
[build]
  publish = "dist"
  command = "yarn build"
  functions = "netlify/functions"

[dev]
  command = "vite"
  targetPort = 3002
  port = 8888
  autoLaunch = false
```

## Development Workflow

### Local Development

```bash
yarn dev  # Starts Netlify Dev on http://localhost:8888
```

This automatically:

- Starts Vite on an available port (typically 3002)
- Proxies requests through Netlify Dev on port 8888
- Loads serverless functions from `netlify/functions/`
- Injects environment variables from `.env.local`

### Testing the Serverless Function

Open `http://localhost:8888` and:

1. Grant camera permission
2. Show your hand to camera
3. Pinch to draw
4. Click "GUESS DRAWING"
5. The serverless function will analyze your drawing

### Build for Production

```bash
yarn build  # Creates optimized bundle in dist/
```

## Deployment to Netlify

### 1. Connect Repository

1. Push code to GitHub
2. Go to [Netlify Dashboard](https://app.netlify.com/)
3. Click "Add new site" → "Import an existing project"
4. Connect to your GitHub repository

### 2. Configure Build Settings

Netlify will auto-detect settings from `netlify.toml`, but verify:

- **Build command**: `yarn build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3. Add Environment Variable

In Netlify Dashboard:

1. Go to **Site settings** → **Environment variables**
2. Click **Add a variable**
3. Set:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key
   - **Scopes**: All (Production, Deploy Previews, Branch deploys)

### 4. Deploy

Click "Deploy site" - Netlify will:

- Build your Vite app
- Deploy serverless functions
- Inject environment variables (server-side only)
- Deploy to a `.netlify.app` URL

**Your API key will NEVER be exposed** in the deployed JavaScript!

## Environment Variables

### `.env.local` (Local Development)

```bash
# Server-side only - used by Netlify Functions
GEMINI_API_KEY=AIzaSy...your_key_here
```

**Key Points**:

- No `VITE_` prefix = server-side only
- Never committed to git (in `.gitignore`)
- Loaded by Netlify Dev automatically
- Used in `netlify/functions/analyze-drawing.ts`

### Netlify Dashboard (Production)

Add the same variable in Netlify UI:

- Variable name: `GEMINI_API_KEY`
- Value: Your API key
- Scope: All deploy contexts

## Troubleshooting

### "Cannot find module '@netlify/functions'"

**Solution**: Install dev dependencies:

```bash
yarn install
```

### "API key not found" Error

**Cause**: Environment variable not loaded

**Solutions**:

1. Verify `.env.local` exists with `GEMINI_API_KEY=your_key`
2. Restart Netlify Dev: `yarn dev`
3. Check for typos in variable name

### Functions Not Loading

**Solution**: Verify `netlify.toml` has:

```toml
[build]
  functions = "netlify/functions"
```

### Port Already in Use

Netlify Dev will automatically try different ports. Check terminal output for the actual URL (typically `http://localhost:8888`).

## Package Scripts

```json
{
  "dev": "netlify dev",          // Start local dev with functions
  "dev:vite": "vite",             // Start Vite only (no functions)
  "build": "vite build",          // Build for production
  "preview": "vite preview"       // Preview production build
}
```

## TypeScript Configuration

### `vite-env.d.ts`

No client-side environment variables are exposed:

```typescript
/// <reference types="vite/client" />

// No environment variables exposed to client side
// API key is stored server-side in Netlify Functions
```

## Dependencies

### Production Dependencies

```json
{
  "@google/genai": "^1.30.0",         // Gemini SDK (used in functions)
  "@mediapipe/tasks-vision": "^0.10.22", // Hand tracking
  "lucide-react": "^0.554.0",         // Icons
  "react": "^19.2.0",                 // UI framework
  "react-dom": "^19.2.0"              // React DOM
}
```

### Dev Dependencies

```json
{
  "@netlify/functions": "^5.1.0",     // Function types
  "@types/node": "^22.14.0",          // Node.js types
  "@vitejs/plugin-react": "^5.0.0",   // Vite React plugin
  "netlify-cli": "^23.11.1",          // Local dev server
  "typescript": "~5.8.2",             // TypeScript
  "vite": "^6.2.0"                    // Build tool
}
```

## Best Practices

### Security

- ✅ **Never use `VITE_` prefix** for API keys
- ✅ **Always use serverless functions** for API calls
- ✅ **Add `.env.local` to `.gitignore`**
- ✅ **Validate requests** in serverless functions
- ✅ **Implement rate limiting** per user

### Performance

- ✅ **Use Gemini 2.5 Flash** for speed
- ✅ **Limit image size** before sending
- ✅ **Enable GPU acceleration** for MediaPipe
- ✅ **Implement error handling** with fallbacks

### Development

- ✅ **Use `yarn dev`** for full local simulation
- ✅ **Test functions locally** before deploying
- ✅ **Monitor function logs** in Netlify Dashboard
- ✅ **Check browser console** for client errors

## Additional Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Google Gemini API](https://ai.google.dev/docs)
- [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [Vite Documentation](https://vitejs.dev/)

## Version History

- **v1.0.0** (2025-11-20): Initial release with secure serverless architecture
- **Security Update** (2025-11-20): Migrated from client-side API calls to Netlify Functions

---

**Last Updated**: November 20, 2025
**Architecture**: Secure Serverless with Netlify Functions
**Node Version**: 20
**Gemini Model**: 2.5 Flash
