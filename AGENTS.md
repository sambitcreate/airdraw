# AI Agents and Services in AIRDRAW

This document provides a comprehensive overview of all AI agents and services integrated into the AIRDRAW application, including their architecture, implementation details, and integration patterns.

## 🔒 Security Architecture

**IMPORTANT**: This application uses a **secure serverless architecture** to protect the Gemini API key:

```text
Browser → Netlify Function → Gemini API
(no key)    (has key)         (receives request)
```

The Gemini API key is **NEVER exposed** in the client-side code. All API calls are proxied through a Netlify Function at `netlify/functions/analyze-drawing.ts`.

## Overview

AIRDRAW leverages two primary AI/ML services to create an intelligent gesture-drawing experience:

1. **Google Gemini 2.5 Flash** - Generative AI for drawing analysis (via Netlify Functions)
2. **Google MediaPipe Hand Landmarker** - Computer vision for hand tracking (client-side)

## 1. Google Gemini AI Agent

### Service Details

- **Provider**: Google AI
- **Model**: Gemini 2.5 Flash (gemini-2.5-flash)
- **Service**: Google Generative AI
- **API Library**: @google/genai v1.30.0
- **API Version**: Latest (2025)

### Purpose

The Gemini AI agent serves as an enthusiastic "Art Critic" for the AIRDRAW application. It analyzes user drawings and provides constructive, entertaining feedback about what the drawing represents, similar to playing a game of Pictionary.

### Implementation Details

#### Location

- **Client Function**: [services/geminiService.ts](services/geminiService.ts) - Calls serverless function
- **Serverless Function**: [netlify/functions/analyze-drawing.ts](netlify/functions/analyze-drawing.ts) - Calls Gemini API
- **Main Function**: `analyzeDrawing(dataUrl: string): Promise<string>`

#### Authentication

- **Method**: API Key authentication (server-side only)
- **Storage**: Environment variable `GEMINI_API_KEY` (no `VITE_` prefix)
- **Configuration**: Loaded from `.env.local` (local) or Netlify Dashboard (production)
- **Security**: API key is server-side only, never exposed in browser JavaScript

#### How It Works (Secure Flow)

1. **Canvas Capture**: When the user clicks "GUESS DRAWING" button, the drawing canvas is captured
2. **Image Conversion**: Canvas content is converted to base64-encoded PNG format using `canvas.toDataURL("image/png")`
3. **Client Request**: Client calls Netlify Function at `/.netlify/functions/analyze-drawing`
4. **Server Processing**: Netlify Function receives image, extracts base64 data
5. **API Request**: Function calls Gemini 2.5 Flash with API key and specialized prompt
6. **Response Processing**: AI returns a concise, enthusiastic interpretation
7. **Server Response**: Function returns result to client
8. **UI Display**: Result is shown in a toast notification at the top of the screen

#### Prompt Engineering

The system uses a carefully crafted prompt to ensure consistent, entertaining responses:

```text
You are an art critic playing Pictionary. Briefly guess what this drawing represents.
Be enthusiastic and constructive. Keep it under 30 words.
```

This prompt encourages:

- Brief, focused responses
- Enthusiastic tone
- Constructive feedback
- Game-like interaction

#### Configuration

```typescript
{
  model: "gemini-2.5-flash",
  inputFormat: "base64 PNG image",
  responseFormat: "Plain text string",
  maxResponseLength: "~30 words",
  temperature: Default (not specified)
}
```

#### Error Handling

The service implements graceful error handling:

- **API Errors**: Returns fallback message if analysis fails
- **Network Errors**: Catches and logs errors, provides user-friendly message
- **Invalid Images**: Handles cases where canvas is empty or invalid
- **Rate Limiting**: Respects API rate limits (handled by Google SDK)

#### Example Flow

```typescript
// User draws on canvas
// User clicks "GUESS DRAWING" button
const dataUrl = canvas.toDataURL("image/png");
const result = await analyzeDrawing(dataUrl);
// Display result: "I see a cheerful sun with radiating beams!
// The circular center and wavy lines create a warm, uplifting scene!"
```

### Performance Characteristics

- **Average Response Time**: 1-3 seconds
- **Concurrent Requests**: Handled sequentially to prevent rate limit issues
- **Loading State**: UI shows loading indicator during analysis
- **Caching**: No caching implemented (each analysis is fresh)

## 2. MediaPipe Hand Landmarker Agent

### Service Details

- **Provider**: Google MediaPipe
- **Model**: Hand Landmarker (Float16 precision)
- **Service**: Computer Vision for real-time hand tracking
- **API Library**: @mediapipe/tasks-vision v0.10.22
- **Running Mode**: VIDEO (optimized for real-time video processing)

### Purpose

The MediaPipe Hand Landmarker enables natural gesture-based drawing by:

- Tracking hand movements through webcam in real-time
- Detecting specific hand landmarks (21 points per hand)
- Recognizing pinch gestures for drawing activation
- Providing smooth cursor tracking for precise drawing

### Implementation

#### Code Location

- **File**: [components/VideoCanvas.tsx](components/VideoCanvas.tsx)
- **Setup Function**: `setupHandLandmarker()` (lines 47-73)
- **Detection Loop**: `predictWebcam()` (lines 145-245)

#### Model Configuration

```typescript
{
  baseOptions: {
    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    delegate: "GPU" // Hardware acceleration
  },
  runningMode: "VIDEO", // Real-time video processing
  numHands: 1 // Track single hand for simplicity
}
```

#### Key Constants

```typescript
const PINCH_THRESHOLD = 0.08;      // Distance for pinch detection
const SMOOTHING_FACTOR = 0.2;      // Cursor interpolation smoothing
const CURSOR_RADIUS = 6;           // Visual cursor size in pixels
```

### How It Works

#### 1. Initialization Phase

1. **WASM Loading**: Loads MediaPipe WASM files from CDN
2. **Model Download**: Fetches hand landmarker model (~3MB)
3. **GPU Setup**: Initializes GPU delegate for acceleration
4. **Camera Request**: Requests user webcam permission

#### 2. Hand Tracking Loop

The tracking loop runs continuously using `requestAnimationFrame`:

```typescript
1. Capture video frame
2. Detect hand landmarks (21 points)
3. Extract key landmarks:
   - Index finger tip (landmark 8)
   - Thumb tip (landmark 4)
4. Calculate pinch distance
5. Determine if pinching (distance < threshold)
6. Map coordinates to screen space
7. Apply smoothing to cursor position
8. Update cursor visualization
9. Draw if pinching
10. Repeat
```

#### 3. Coordinate Mapping

```typescript
// MediaPipe returns normalized coordinates (0-1)
// We map them to screen pixels and mirror horizontally
const targetX = (1 - indexTip.x) * canvas.width;
const targetY = indexTip.y * canvas.height;
```

#### 4. Gesture Recognition

**Pinch Gesture Detection**:

```typescript
const pinchDistance = getDistance(
  { x: indexTip.x, y: indexTip.y },
  { x: thumbTip.x, y: thumbTip.y }
);
const isPinching = pinchDistance < PINCH_THRESHOLD;
```

#### 5. Drawing Mechanics

When pinching is detected:

- Cursor changes from outline to filled circle
- Lines are drawn between current and last position
- UI shows "Active" status badge
- Drawing respects selected color and brush size

### Visual Layers

The component renders multiple canvas layers:

1. **Video Layer** (z-index: base): Mirrored webcam feed, 40% opacity, grayscale effect
2. **Drawing Canvas** (z-index: 10): User's artwork
3. **UI Layer** (z-index: 20): Toolbar and controls
4. **Cursor Canvas** (z-index: 30): Real-time hand cursor overlay

### Performance Optimization

- **GPU Acceleration**: Uses WebGL for hand detection
- **Frame Skipping**: Adapts to device performance
- **Efficient Rendering**: Only updates changed regions
- **Smooth Interpolation**: Reduces jitter with lerp function

## Integration Flow

### Complete User Journey

```text
1. App Launch
   ↓
2. MediaPipe Initialization (Loading screen)
   ↓
3. Camera Permission Request
   ↓
4. Video Feed Starts
   ↓
5. Hand Detection Active
   ↓
6. User Shows Hand → Cursor Appears
   ↓
7. User Pinches → "Active" Status
   ↓
8. User Draws → Canvas Updates
   ↓
9. User Releases → Cursor Returns
   ↓
10. User Clicks "GUESS DRAWING"
    ↓
11. Canvas Captured → Sent to Gemini
    ↓
12. AI Analysis → Response Displayed
    ↓
13. User Can Continue Drawing or Clear
```

### Event Flow Diagram

```text
User Action → MediaPipe Detection → UI Update → Canvas Render
                                   ↓
                              Drawing Data
                                   ↓
User Triggers Analysis → Gemini API → AI Response → Toast Display
```

## Environment Setup

### Required Environment Variables

```bash
# .env.local
# Server-side only - NOT exposed to client
GEMINI_API_KEY=your_gemini_api_key_here
```

**Note**: Use `GEMINI_API_KEY` (no `VITE_` prefix) to keep it server-side only.

### Dependencies

Install via Yarn:

```json
{
  "@google/genai": "^1.30.0",
  "@mediapipe/tasks-vision": "^0.10.22-rc.20250304"
}
```

### CDN Resources

The app uses import maps for browser-native ESM:

```javascript
{
  "@google/genai": "https://aistudiocdn.com/@google/genai@^1.30.0",
  "@mediapipe/tasks-vision": "https://aistudiocdn.com/@mediapipe/tasks-vision@^0.10.22-rc.20250304"
}
```

## Future Enhancement Opportunities

### Potential AI Agents to Add

1. **Drawing Enhancement AI**
   - Auto-complete partial drawings
   - Suggest improvements
   - Refine rough sketches

2. **Style Transfer AI**
   - Apply artistic styles (watercolor, oil painting, etc.)
   - Transform drawings into different art movements
   - Generate variations of user drawings

3. **Multi-Object Recognition**
   - Detect multiple objects in a single drawing
   - Provide detailed breakdown of elements
   - Score individual components

4. **Collaborative Drawing AI**
   - AI that draws alongside the user
   - Turn-based drawing game with AI
   - AI suggests next elements to add

5. **Voice Command Agent**
   - Voice-controlled color/brush selection
   - Verbal feedback instead of text
   - Voice-to-drawing generation

6. **Emotion Detection**
   - Analyze drawing mood/emotion
   - Suggest colors based on detected emotion
   - Track emotional journey through drawings

7. **Save & Share Agent**
   - Generate shareable artwork descriptions
   - Create social media posts automatically
   - Suggest hashtags based on drawing content

## Privacy & Security Considerations

### Data Handling

- **Webcam Feed**: Processed 100% locally in browser via MediaPipe WASM
- **Video Frames**: Never leave the device
- **Canvas Images**: Only sent to Gemini when user explicitly triggers analysis
- **No Storage**: No drawings or video data stored on servers
- **API Key**: Should be server-side in production (currently client-side for demo)

### Best Practices for Production

1. **Server-Side API Proxy**: Move API key to backend
2. **Rate Limiting**: Implement per-user analysis limits
3. **Input Validation**: Validate canvas data before sending
4. **HTTPS Only**: Enforce secure connections
5. **Content Filtering**: Screen for inappropriate content
6. **User Consent**: Clear privacy policy and camera usage consent

## Troubleshooting

### Gemini API Issues

- **Error**: "API key not found"
  - **Solution**: Ensure `.env.local` exists with valid `API_KEY`

- **Error**: "Rate limit exceeded"
  - **Solution**: Wait before sending another request, implement cooldown

- **Error**: "Invalid image format"
  - **Solution**: Verify canvas is not empty before analysis

### MediaPipe Issues

- **Hand Not Detected**
  - Check lighting conditions
  - Ensure hand is fully visible
  - Wait for model to fully load

- **Laggy Tracking**
  - Check device performance
  - Close other applications
  - Ensure GPU acceleration is enabled

- **Pinch Not Working**
  - Adjust pinch threshold in constants
  - Ensure fingers are clearly visible
  - Try adjusting camera angle

## Performance Metrics

### Typical Performance

- **MediaPipe FPS**: 30-60 FPS on modern devices
- **Gemini Response**: 1-3 seconds average
- **Initial Load**: 2-4 seconds (model download)
- **Memory Usage**: ~150-300 MB

### Optimization Tips

1. Use GPU delegate for MediaPipe
2. Limit canvas resolution for analysis
3. Implement request debouncing
4. Cache MediaPipe model locally (future enhancement)

## Additional Resources

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [MediaPipe Hand Landmarker Guide](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [MediaPipe WASM Documentation](https://developers.google.com/mediapipe/solutions/guide)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

## Version History

- **v1.0.0** (2025-11-20): Initial implementation with Gemini 2.5 Flash and MediaPipe Hand Landmarker
- **Future**: Planning multi-agent collaboration features
