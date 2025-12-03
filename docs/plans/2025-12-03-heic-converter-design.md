# HEIC to JPEG Converter - Design Document

## Overview

A client-side PWA that converts HEIC/HEIF images to JPEG format, optimized for batch processing on iPhone. Hosted on GitHub Pages.

## Requirements

- **Use case:** Personal tool for converting iPhone photos
- **Input:** Up to 100 HEIC/HEIF files selected from iOS photo picker
- **Output:** Single ZIP file containing all converted JPEGs
- **Quality:** Maximum (95%) JPEG quality
- **Performance:** Parallel processing with 4 Web Workers
- **Deployment:** Static site on GitHub Pages
- **Offline:** PWA with service worker caching

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Main Thread (UI)                      │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌───────────┐ │
│  │ Upload  │→ │ Progress │→ │ ZIP Gen │→ │ Download  │ │
│  │ Button  │  │   Bar    │  │ (JSZip) │  │  Button   │ │
│  └─────────┘  └──────────┘  └─────────┘  └───────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ postMessage (Transferable)
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Worker 1│      │ Worker 2│      │ Worker 3│   (4 workers)
   │ heic-to │      │ heic-to │      │ heic-to │
   │  WASM   │      │  WASM   │      │  WASM   │
   └─────────┘      └─────────┘      └─────────┘
```

## UI States

### State 1: Initial
- App title
- "Select Photos" button
- "0 photos selected" text

### State 2: Photos Selected
- "Select Photos" button (to add more or reselect)
- "X photos selected" text
- "Convert" button appears

### State 3: Converting
- Progress bar with percentage
- "Converting... X/Y" text
- Estimated time remaining

### State 4: Complete
- Success message
- "Download ZIP (X MB)" button
- "Convert More" link to reset

## Memory Management

To handle 100 photos (~400MB) without crashing iOS Safari:

1. **Stream files to workers** - Don't load all files into memory upfront
2. **Transferable ArrayBuffers** - Zero-copy data transfer between threads
3. **4 workers max** - Balance between parallelism and memory overhead
4. **Eager cleanup** - Null references after conversion completes

### Worker Pool Flow

1. Main thread maintains file queue
2. Workers request files when idle
3. Main thread reads one file, transfers ArrayBuffer to worker
4. Worker converts, transfers JPEG Blob back
5. Main thread stores Blob reference, releases source
6. Repeat until queue empty
7. JSZip bundles all Blobs into ZIP

## Dependencies

| Library | Version | Size | CDN |
|---------|---------|------|-----|
| heic-to | latest | ~1.5MB | esm.sh or unpkg |
| JSZip | 3.x | ~40KB | cdnjs |
| Pico CSS | 2.x | ~10KB | unpkg |

All loaded via CDN, cached by service worker for offline use.

## PWA Configuration

### manifest.json
```json
{
  "name": "HEIC to JPEG",
  "short_name": "HEIC→JPEG",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d6efd",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### iOS-Specific Meta Tags
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="icon-180.png">
```

### Service Worker Strategy
- Precache: index.html, worker.js, WASM bundle, CSS
- Cache-first for all assets
- Full offline functionality after first visit

## File Structure

```
/
├── index.html          # Main app with inline JS
├── worker.js           # Conversion web worker
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── icon-180.png       # iOS home screen icon
├── icon-192.png       # Android PWA icon
└── icon-512.png       # PWA splash icon
```

## Deployment

1. Push to GitHub repository
2. Enable GitHub Pages (Settings → Pages → Deploy from main branch)
3. Access at `https://<username>.github.io/<repo-name>/`

## Technical Notes

### iOS Safari Quirks
- File input with `accept="image/heic,image/heif,.heic,.heif"` opens photo picker
- `multiple` attribute enables multi-select
- No native install prompt - users add via Share → Add to Home Screen
- Memory limits vary by device (~1-2GB for Safari tabs)

### heic-to Library
- Uses WebAssembly (libheif)
- Import from `heic-to/worker` for Web Worker compatibility
- Supports JPEG output with quality parameter (0-1)

### Error Handling
- Individual file failures don't stop the batch
- Failed files logged to console, skipped in ZIP
- User sees "X of Y converted successfully" if some fail
