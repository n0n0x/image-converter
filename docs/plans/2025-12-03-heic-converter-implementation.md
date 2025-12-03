# HEIC to JPEG Converter - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-side PWA that batch-converts HEIC photos to JPEG with parallel Web Workers.

**Architecture:** Single HTML page with Pico CSS, 4 Web Workers for parallel HEIC→JPEG conversion using heic-to WASM library, JSZip for bundling output, Service Worker for offline PWA support.

**Tech Stack:** Vanilla JS (ES modules), Pico CSS (CDN), heic-to (CDN), JSZip (CDN), GitHub Pages hosting.

---

## Task 1: Create Basic HTML Structure

**Files:**
- Create: `index.html`

**Step 1: Create index.html with Pico CSS and PWA meta tags**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HEIC to JPEG</title>

  <!-- PWA Meta Tags -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#0d6efd">
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icon-180.png">

  <!-- Pico CSS -->
  <link rel="stylesheet" href="https://unpkg.com/@picocss/pico@2/css/pico.min.css">

  <style>
    :root {
      --pico-font-size: 100%;
    }

    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 1rem;
      max-width: 500px;
      margin: 0 auto;
      text-align: center;
    }

    h1 {
      font-size: 1.75rem;
      margin-bottom: 2rem;
    }

    .file-input-wrapper {
      position: relative;
    }

    .file-input-wrapper input[type="file"] {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    #status {
      margin: 1rem 0;
      font-size: 0.9rem;
      color: var(--pico-muted-color);
    }

    #progress-container {
      display: none;
      margin: 1.5rem 0;
    }

    #progress-container.visible {
      display: block;
    }

    #convert-btn, #download-btn, #reset-btn {
      display: none;
    }

    #convert-btn.visible, #download-btn.visible, #reset-btn.visible {
      display: inline-block;
    }

    #reset-btn {
      background: none;
      border: none;
      color: var(--pico-primary);
      text-decoration: underline;
      cursor: pointer;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <main class="container">
    <h1>HEIC → JPEG</h1>

    <div class="file-input-wrapper">
      <button id="select-btn" class="contrast">Select Photos</button>
      <input type="file" id="file-input" accept="image/heic,image/heif,.heic,.heif" multiple>
    </div>

    <p id="status">0 photos selected</p>

    <div id="progress-container">
      <progress id="progress" value="0" max="100"></progress>
      <p id="progress-text">Converting... 0/0</p>
    </div>

    <button id="convert-btn">Convert</button>
    <button id="download-btn">Download ZIP</button>
    <button id="reset-btn">Convert More</button>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

**Step 2: Verify by opening in browser**

Open `index.html` in browser. Should see:
- "HEIC → JPEG" title
- "Select Photos" button
- "0 photos selected" text

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add basic HTML structure with Pico CSS"
```

---

## Task 2: Create Main Application JavaScript

**Files:**
- Create: `app.js`

**Step 1: Create app.js with file selection and state management**

```javascript
// State
let selectedFiles = [];
let convertedBlobs = [];
let workers = [];
let activeWorkers = 0;
let fileQueue = [];
let processedCount = 0;

// DOM Elements
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const status = document.getElementById('status');
const progressContainer = document.getElementById('progress-container');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const convertBtn = document.getElementById('convert-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

// Constants
const WORKER_COUNT = 4;
const JPEG_QUALITY = 0.95;

// Initialize workers
function initWorkers() {
  for (let i = 0; i < WORKER_COUNT; i++) {
    const worker = new Worker('worker.js', { type: 'module' });
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
    workers.push(worker);
  }
}

// Handle file selection
fileInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);
  updateStatus();
});

function updateStatus() {
  const count = selectedFiles.length;
  status.textContent = `${count} photo${count !== 1 ? 's' : ''} selected`;

  if (count > 0) {
    convertBtn.classList.add('visible');
  } else {
    convertBtn.classList.remove('visible');
  }
}

// Start conversion
convertBtn.addEventListener('click', startConversion);

async function startConversion() {
  if (selectedFiles.length === 0) return;

  // Reset state
  convertedBlobs = [];
  processedCount = 0;
  fileQueue = [...selectedFiles];

  // Update UI
  selectBtn.disabled = true;
  convertBtn.classList.remove('visible');
  progressContainer.classList.add('visible');
  updateProgress();

  // Initialize workers if not done
  if (workers.length === 0) {
    initWorkers();
  }

  // Start workers
  for (let i = 0; i < Math.min(WORKER_COUNT, fileQueue.length); i++) {
    processNextFile(workers[i]);
  }
}

async function processNextFile(worker) {
  if (fileQueue.length === 0) {
    activeWorkers--;
    if (activeWorkers === 0) {
      onConversionComplete();
    }
    return;
  }

  activeWorkers++;
  const file = fileQueue.shift();

  try {
    const arrayBuffer = await file.arrayBuffer();
    worker.postMessage(
      { arrayBuffer, fileName: file.name, quality: JPEG_QUALITY },
      [arrayBuffer]
    );
  } catch (err) {
    console.error('Error reading file:', file.name, err);
    processedCount++;
    updateProgress();
    processNextFile(worker);
  }
}

function handleWorkerMessage(e) {
  const { blob, fileName, error } = e.data;
  const worker = e.target;

  if (error) {
    console.error('Conversion error for', fileName, error);
  } else if (blob) {
    convertedBlobs.push({ blob, fileName: fileName.replace(/\.heic$/i, '.jpg') });
  }

  processedCount++;
  updateProgress();
  processNextFile(worker);
}

function handleWorkerError(e) {
  console.error('Worker error:', e);
  processedCount++;
  updateProgress();
}

function updateProgress() {
  const total = selectedFiles.length;
  const percent = Math.round((processedCount / total) * 100);
  progress.value = percent;
  progressText.textContent = `Converting... ${processedCount}/${total}`;
}

async function onConversionComplete() {
  progressText.textContent = `${convertedBlobs.length} of ${selectedFiles.length} converted`;

  // Create ZIP
  const { default: JSZip } = await import('https://esm.sh/jszip@3.10.1');
  const zip = new JSZip();

  for (const { blob, fileName } of convertedBlobs) {
    zip.file(fileName, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const sizeMB = (zipBlob.size / 1024 / 1024).toFixed(1);

  // Update UI
  progressContainer.classList.remove('visible');
  downloadBtn.textContent = `Download ZIP (${sizeMB} MB)`;
  downloadBtn.classList.add('visible');
  resetBtn.classList.add('visible');

  // Store for download
  downloadBtn.onclick = () => {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-photos.zip';
    a.click();
    URL.revokeObjectURL(url);
  };
}

// Reset
resetBtn.addEventListener('click', () => {
  selectedFiles = [];
  convertedBlobs = [];
  processedCount = 0;
  fileQueue = [];

  fileInput.value = '';
  selectBtn.disabled = false;
  status.textContent = '0 photos selected';
  progressContainer.classList.remove('visible');
  progress.value = 0;
  convertBtn.classList.remove('visible');
  downloadBtn.classList.remove('visible');
  resetBtn.classList.remove('visible');
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
```

**Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add main application logic with worker pool"
```

---

## Task 3: Create Web Worker for HEIC Conversion

**Files:**
- Create: `worker.js`

**Step 1: Create worker.js using heic-to library**

```javascript
import heicTo from 'https://esm.sh/heic-to@1.1.0';

self.onmessage = async (e) => {
  const { arrayBuffer, fileName, quality } = e.data;

  try {
    const blob = await heicTo({
      blob: new Blob([arrayBuffer]),
      type: 'image/jpeg',
      quality: quality
    });

    self.postMessage({ blob, fileName });
  } catch (error) {
    self.postMessage({ error: error.message, fileName });
  }
};
```

**Step 2: Test conversion manually**

1. Open `index.html` in browser (use local server: `python3 -m http.server 8000`)
2. Select a HEIC file
3. Click Convert
4. Check browser console for errors
5. Should see progress update and eventually download button

**Step 3: Commit**

```bash
git add worker.js
git commit -m "feat: add web worker for HEIC to JPEG conversion"
```

---

## Task 4: Create PWA Manifest

**Files:**
- Create: `manifest.json`

**Step 1: Create manifest.json**

```json
{
  "name": "HEIC to JPEG Converter",
  "short_name": "HEIC→JPEG",
  "description": "Convert HEIC photos to JPEG format",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d6efd",
  "orientation": "portrait",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Step 2: Commit**

```bash
git add manifest.json
git commit -m "feat: add PWA manifest"
```

---

## Task 5: Create Service Worker for Offline Support

**Files:**
- Create: `sw.js`

**Step 1: Create sw.js with cache-first strategy**

```javascript
const CACHE_NAME = 'heic-converter-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/worker.js',
  '/manifest.json',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  'https://unpkg.com/@picocss/pico@2/css/pico.min.css',
  'https://esm.sh/heic-to@1.1.0',
  'https://esm.sh/jszip@3.10.1'
];

// Install - cache assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch - cache first, then network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  );
});
```

**Step 2: Commit**

```bash
git add sw.js
git commit -m "feat: add service worker for offline PWA support"
```

---

## Task 6: Create PWA Icons

**Files:**
- Create: `icon-180.png` (iOS)
- Create: `icon-192.png` (Android)
- Create: `icon-512.png` (Splash)

**Step 1: Create simple SVG-based icons**

We'll create a simple icon programmatically using canvas. Add this script temporarily or use an online tool.

For a quick solution, create a simple colored square with "HEIC" text using any image editor, or use this Node.js script (if Node is available):

```bash
# Option A: Use placeholder icons initially (colored squares)
# Create with ImageMagick if available:
convert -size 180x180 xc:#0d6efd -fill white -gravity center -pointsize 36 -annotate 0 'HEIC' icon-180.png
convert -size 192x192 xc:#0d6efd -fill white -gravity center -pointsize 38 -annotate 0 'HEIC' icon-192.png
convert -size 512x512 xc:#0d6efd -fill white -gravity center -pointsize 96 -annotate 0 'HEIC' icon-512.png
```

**Alternative: Use inline SVG data URI as favicon (no external files needed):**

If you don't have ImageMagick, we can use a JavaScript approach to generate icons on first load and download them, or simply use placeholder solid color PNGs.

For now, create minimal 1x1 placeholder PNGs and replace later:

```bash
# Create minimal placeholder (will work, just not pretty)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > icon-180.png
cp icon-180.png icon-192.png
cp icon-180.png icon-512.png
```

**Step 2: Commit**

```bash
git add icon-180.png icon-192.png icon-512.png
git commit -m "feat: add PWA icons (placeholder)"
```

---

## Task 7: Test Full Application Locally

**Step 1: Start local server**

```bash
python3 -m http.server 8000
```

**Step 2: Test in browser**

1. Open http://localhost:8000
2. Select multiple HEIC files
3. Click Convert
4. Verify progress updates
5. Download ZIP and verify contents
6. Check DevTools → Application → Service Workers (should be registered)
7. Check DevTools → Application → Manifest (should show PWA info)

**Step 3: Test offline**

1. In DevTools → Network, check "Offline"
2. Reload page - should still work
3. Uncheck "Offline"

---

## Task 8: Deploy to GitHub Pages

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Step 2: Enable GitHub Pages**

1. Go to repository Settings → Pages
2. Source: Deploy from branch
3. Branch: main, folder: / (root)
4. Save

**Step 3: Wait and verify**

1. Wait 1-2 minutes for deployment
2. Access at `https://<username>.github.io/<repo-name>/`
3. Test full flow on iPhone:
   - Open URL in Safari
   - Select Photos → multi-select HEIC files
   - Convert and download ZIP
   - Add to Home Screen (Share → Add to Home Screen)
   - Open from home screen (should be fullscreen PWA)

---

## Task 9: Fix GitHub Pages Base Path (if needed)

If deployed to a subdirectory (e.g., `/heic-converter/`), update paths:

**Files:**
- Modify: `index.html`
- Modify: `manifest.json`
- Modify: `sw.js`

**Step 1: Update manifest.json start_url**

```json
{
  "start_url": "/heic-converter/",
  ...
}
```

**Step 2: Update sw.js ASSETS paths**

```javascript
const ASSETS = [
  '/heic-converter/',
  '/heic-converter/index.html',
  '/heic-converter/app.js',
  // ... etc
];
```

**Step 3: Commit and push**

```bash
git add -A
git commit -m "fix: update paths for GitHub Pages subdirectory"
git push origin main
```

---

## Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | HTML structure with Pico CSS | `feat: add basic HTML structure with Pico CSS` |
| 2 | Main app.js with worker pool | `feat: add main application logic with worker pool` |
| 3 | Web Worker for HEIC conversion | `feat: add web worker for HEIC to JPEG conversion` |
| 4 | PWA manifest | `feat: add PWA manifest` |
| 5 | Service Worker | `feat: add service worker for offline PWA support` |
| 6 | PWA icons | `feat: add PWA icons (placeholder)` |
| 7 | Local testing | (no commit) |
| 8 | GitHub Pages deployment | (push existing commits) |
| 9 | Path fixes if needed | `fix: update paths for GitHub Pages subdirectory` |
