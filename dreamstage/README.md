# DreamStage

DreamStage is a voice- and gesture-controlled AI overlay for live streamers. It allows streamers to summon AI sidekicks and interact with their audience in real-time.

## Architecture

- **Framework**: Next.js (App Router) + React
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: Zustand
- **Cross-Window Sync**: `BroadcastChannel` (for local same-browser syncing) & WebSockets/Server-Sent Events (SSE) via Next.js API routes (for cross-device/OBS syncing).
- **Voice Recognition**: Web Speech API (`webkitSpeechRecognition`) for always-listening.

### Folder Structure
```
/dreamstage
  /app
    /stage         # The OBS Browser Source route (transparent bg)
    /control       # The streamer dashboard route
    /api           # API routes (LLM, Sync, TTS)
  /components
    /stage         # Components specific to the stage (Characters, Cards)
    /control       # Components for the control panel (Mic, Settings)
    /shared        # Shared components
  /store           # Zustand state management
  /lib             # Helper functions (speech, gestures, sync)
```

## Setup & Environment

No specific environment variables are needed for Phase 1. Just install dependencies and run:

```bash
npm install
npm run dev &
```

**Note on Deployment:** Phase 1 uses an in-memory Node.js array for Server-Sent Events (SSE) to sync the control panel with the stage. This works perfectly when running locally (`npm run dev &`), which is the recommended way to use this with OBS on the same machine. If you deploy to Vercel (a serverless environment), the SSE sync will not work across devices because serverless functions don't share memory. For Vercel deployment with cross-device sync, a pub/sub service like Pusher or Redis is required.

## OBS & Google Meet Instructions

### OBS Studio Setup
1. Run the app locally (`npm run dev &`).
2. Open OBS Studio.
3. Add a new **Browser Source**.
4. Set the URL to `http://localhost:3000/stage`.
5. Set the Width to `1920` and Height to `1080` (or your canvas size).
6. Check **"Route audio to OBS"** (if/when we add TTS audio).
7. The background will automatically be transparent.

### Google Meet Setup
1. Run the app locally (`npm run dev &`).
2. Open `http://localhost:3000/stage` in a new Chrome window (not a tab, but a separate window).
3. Use a tool like **OBS Virtual Camera** to capture that window, or use Google Meet's **"Present a tab"** feature and select the Stage tab.

## Test Checklist (Phase 1)
- [ ] **Start the app:** Run `npm run dev &`.
- [ ] **Open Control Panel:** Navigate to `http://localhost:3000/control` in Chrome.
- [ ] **Open Stage:** Navigate to `http://localhost:3000/stage` in a separate window or tab.
- [ ] **Test Manual Trigger:** Click "Trigger 'Hi Dream' Sequence" in the control panel. Both characters should appear on the stage with a greeting animation.
- [ ] **Test Dismiss:** Click "Dismiss Characters". They should animate out.
- [ ] **Test Voice Trigger:** Click "Start Mic", allow microphone permissions, and clearly say "Hi Dream". The characters should appear automatically.

## Phase 2 Setup Updates
To use the LLM chat functionality, you must add an OpenAI API key.
Create a `.env.local` file in the root of the project:
```
OPENAI_API_KEY=your_actual_key_here
```

### Test Checklist (Phase 2)
- [ ] **Env variable:** Ensure `OPENAI_API_KEY` is set.
- [ ] **Start the app:** Run `npm run dev &`.
- [ ] **Open Control & Stage:** Open `/control` and `/stage`.
- [ ] **Wake Word:** Say "Hi Dream" to summon them.
- [ ] **Conversation:** Speak to them (e.g., "What do you think of this game?"). They should process the text, print it in the conversation log, and speak back (Dream first, then Sidekick) with distinct voices and lip-sync animation.
- [ ] **Text Input:** Try typing a message in the manual input field and pressing Enter.
- [ ] **Dismiss:** Say "Bye Dream" to dismiss them.

## Phase 3: Hand Tracking & Magic Cursor
The `/control` dashboard now supports MediaPipe Hand tracking!
1. Click **Track Hands** and allow webcam access.
2. Hold up your hand. A magic Doctor Strange-style cursor will appear on the `/stage` overlay, mirroring your index finger.
3. Pinch your thumb and index finger together to trigger the "grab" animation (the cursor ring will turn red and shrink).

## Phase 4 & 5: YouTube Chat & Pull-Forward Cards
There are two ways to bring comments onto the stage:

### Method A: Mock Control Panel Feed
1. Open the `/control` dashboard.
2. In the "YouTube Live Chat" section, click **Start Mock Stream**.
3. Hover over any message and click the **Pin** icon.
4. The message will fly onto the `/stage` overlay with a portal animation. Click the **X** or the **Clear Pinned** button to dismiss it.

### Method B: Chrome Extension (Real YouTube Chat)
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right corner).
3. Click **Load unpacked** and select the `dreamstage/chrome-extension` folder.
4. Go to any live YouTube stream (`youtube.com/live_chat...`).
5. Ensure your Next.js server (`npm run dev`) is running.
6. Click any chat message on YouTube. It will flash orange, and instantly appear as a floating card on your `/stage` overlay!
