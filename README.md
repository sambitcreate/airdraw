# AIRDRAW - AI-Powered Gesture Drawing Canvas

AIRDRAW is an innovative web application that combines computer vision with AI to create a unique drawing experience. Use hand gestures to draw on a virtual canvas, then let AI analyze your artwork!

## Features

- **Gesture-Based Drawing**: Use hand tracking to draw with pinch gestures
- **Real-Time Hand Tracking**: Powered by Google MediaPipe for smooth cursor movement
- **AI Art Analysis**: Google Gemini AI analyzes and interprets your drawings
- **Color Palette**: Choose from 7 vibrant colors including neon pink, cyan, lime green, and more
- **Adjustable Brush Sizes**: 4 brush sizes (4px, 8px, 12px, 20px) for different drawing styles
- **Desktop Experience**: Optimized for desktop browsers with webcam support
- **Real-time Visual Feedback**: See your video feed, drawing canvas, and custom cursor simultaneously

## How It Works

1. **Allow Camera Access**: The app requests permission to access your webcam
2. **Hand Tracking**: MediaPipe detects your hand movements and tracks your index finger
3. **Pinch to Draw**: Make a pinch gesture (thumb and index finger together) to draw
4. **Create Art**: Move your hand while pinching to draw on the canvas
5. **AI Analysis**: Click "GUESS DRAWING" to have Gemini AI analyze your creation
6. **Get Feedback**: Receive enthusiastic interpretation of your artwork in under 30 words

## Technology Stack

- **Frontend**: React 19.2 with TypeScript
- **Computer Vision**: Google MediaPipe Hand Landmarker v0.10.22
- **AI Analysis**: Google Gemini 2.5 Flash (via Netlify Functions)
- **Serverless**: Netlify Functions for secure API key management
- **Build Tool**: Vite 6.2
- **Styling**: Tailwind CSS (CDN)
- **Package Manager**: Yarn 1.22
- **Icons**: Lucide React

## Prerequisites

- Node.js (version 20 or higher)
- Yarn package manager (version 1.22 or higher)
- A desktop device with a webcam
- Google Gemini API key

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sambitcreate/aidraw.git
   cd airdraw-studio
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Set up environment variables**:

   Create a `.env.local` file in the root directory and add your Gemini API key:

   ```bash
   # Server-side only - NOT exposed to client
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   **Note**: Use `GEMINI_API_KEY` (no `VITE_` prefix) to keep it server-side.

4. **Run the development server**:
   ```bash
   yarn dev
   ```

5. **Open your browser** and navigate to the local URL shown in the terminal (typically `http://localhost:5173` or similar)

## API Setup

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key and add it to your `.env.local` file

## Project Structure

```text
airdraw-studio/
├── components/
│   ├── VideoCanvas.tsx    # Main canvas with hand tracking & MediaPipe integration
│   └── Toolbar.tsx        # UI controls for colors, brush sizes, and actions
├── services/
│   └── geminiService.ts   # Google Gemini AI analysis service
├── App.tsx                # Main application component with state management
├── index.tsx              # Application entry point and React root
├── index.html             # HTML template with Tailwind CSS CDN & import maps
├── types.ts               # TypeScript type definitions & constants (colors, brush sizes)
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
├── netlify.toml           # Netlify deployment configuration (Node 20)
├── package.json           # Project dependencies & scripts
├── .env.local             # Environment variables (create this file)
├── .nvmrc                 # Node.js version specification (v20)
├── README.md              # Project documentation
├── AGENTS.md              # AI agents and services documentation
├── CLAUDE.md              # Claude AI integration guide
└── GEMINI.md              # Gemini API configuration guide
```

## Key Components

### VideoCanvas

The main component that handles:

- Webcam video streaming
- MediaPipe hand landmark detection
- Canvas rendering for drawings
- Cursor tracking and visualization
- Pinch gesture detection (threshold: 0.08)
- Smooth cursor interpolation (smoothing factor: 0.2)

### Toolbar

UI component providing:

- Color palette selection (7 colors)
- Brush size controls (4 sizes)
- Clear canvas button
- AI analysis trigger button with loading states

### Gemini Service

AI integration that:

- Converts canvas to base64 PNG format
- Sends image to Gemini 2.5 Flash
- Processes enthusiastic art critique responses
- Handles errors gracefully with fallback messages

## Configuration

### Colors Available

- Neon Pink (#ff00ff)
- Cyan (#00ffff)
- Lime Green (#39ff14)
- Bright Yellow (#ffff00)
- Orange (#ffaa00)
- White (#ffffff)
- Black (#000000) - Works as eraser

### Brush Sizes

- Small: 4px
- Medium: 8px (default)
- Large: 12px
- Extra Large: 20px

### MediaPipe Settings

- Max hands detected: 1
- Running mode: VIDEO (real-time)
- Delegate: GPU acceleration
- Model: Hand Landmarker Float16

## Deployment

The app is configured for easy deployment to Netlify with secure serverless functions:

1. **Connect your repository** to Netlify
2. **Set environment variable** in Netlify Dashboard → Site Settings → Environment Variables:
   - Key: `GEMINI_API_KEY`
   - Value: Your Gemini API key
   - Scopes: All (Production, Deploy Previews, Branch deploys)
3. **Build settings** (auto-detected from `netlify.toml`):
   - Build command: `yarn build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
   - Node.js version: 20
4. **Deploy** - Your API key will be server-side only, never exposed in the deployed JavaScript!

### Local Development with Functions

```bash
yarn dev  # Starts Netlify Dev on http://localhost:8888
```

This runs both the Vite dev server AND the serverless functions locally.

### Build Commands

```bash
yarn build     # Build for production
yarn preview   # Preview production build locally
yarn dev       # Run development server
```

## Browser Support

- Chrome (recommended) - Best performance with MediaPipe
- Firefox - Full support
- Safari - Full support
- Edge - Full support

**Note**: Mobile devices are not supported due to the requirement for precise hand tracking and webcam positioning.

## Privacy & Security

- **Webcam feed**: Processed 100% locally in browser via MediaPipe WASM
- **Video data**: Never leaves your device
- **Canvas images**: Only sent to Gemini when you click "GUESS DRAWING"
- **API key**: Stored server-side in Netlify Functions, **NEVER exposed** in browser
- **No tracking**: No analytics, cookies, or user data collection
- **Open source**: All code is auditable on GitHub

### Secure Architecture

```text
Browser → Netlify Function → Gemini API
(no API key)   (has API key)    (receives request)
```

Your Gemini API key is stored in `netlify/functions/analyze-drawing.ts` and is never included in the client-side JavaScript bundle.

## Troubleshooting

### Black Screen Issue

If you see a black screen:

- Check browser console for errors
- Ensure camera permissions are granted
- Verify `.env.local` file exists with valid API key
- Make sure you're using a desktop device (mobile not supported)

### Hand Not Detected

- Ensure good lighting conditions
- Position hand clearly in front of camera
- Keep hand within camera frame
- Wait for MediaPipe to initialize (loading screen)

### Drawing Not Working

- Check that pinch gesture is detected (status badge shows "Active")
- Ensure thumb and index finger tips are close together
- Try adjusting hand distance from camera

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Google MediaPipe](https://mediapipe.dev/) for hand tracking technology
- [Google Gemini](https://ai.google.dev/) for AI analysis capabilities
- [Vite](https://vitejs.dev/) for the blazing fast build tool
- [React](https://react.dev/) for the UI framework
- [Lucide](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for styling utilities

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/sambitcreate/aidraw/issues) on GitHub.

## Links

- **Live Demo**: [Coming Soon]
- **GitHub**: [https://github.com/sambitcreate/aidraw](https://github.com/sambitcreate/aidraw)
- **Documentation**: See AGENTS.md for detailed AI integration documentation
