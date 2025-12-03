# HEIC to JPEG Converter

A fast, privacy-focused web app that converts HEIC/HEIF photos to JPEG entirely in your browser. No uploads, no server processing—your photos never leave your device.

**[Try it live](https://n0n0x.github.io/image-converter/)**

## Features

- **100% Client-Side** — All conversion happens in your browser. Photos are never uploaded to any server.
- **Batch Processing** — Convert multiple photos at once with parallel processing using Web Workers.
- **Fast ZIP Creation** — Uses [fflate](https://github.com/101arrowz/fflate) for lightning-fast bundling (30x faster than JSZip).
- **Works Offline** — Install as a PWA and use without an internet connection.
- **Mobile Friendly** — Responsive design works on phones, tablets, and desktops.
- **Dark Mode** — Automatically adapts to your system theme.

## How It Works

1. **Select** your HEIC/HEIF photos
2. **Convert** with one tap (uses 4 parallel workers for speed)
3. **Download** a ZIP file containing your converted JPEGs

## Technical Details

| Component | Technology |
|-----------|------------|
| UI Framework | [Pico CSS](https://picocss.com/) |
| HEIC Decoding | [heic-to](https://github.com/nichenqin/heic-to) |
| ZIP Creation | [fflate](https://github.com/101arrowz/fflate) |
| Parallelization | Web Workers (4 concurrent) |
| Offline Support | Service Worker + PWA |

### Architecture

```
index.html    — Single page UI
app.js        — Main thread: file handling, worker pool, ZIP generation
worker.js     — Web Worker: HEIC→JPEG conversion
sw.js         — Service Worker: offline caching
```

### Performance

- **Parallel conversion** — 4 Web Workers process images concurrently
- **No compression overhead** — ZIP uses STORE mode (level 0) since JPEGs are already compressed
- **Streaming** — Files are processed as they're read, not buffered entirely in memory

## Development

```bash
# Clone the repository
git clone https://github.com/n0n0x/image-converter.git
cd image-converter

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

No build step required—it's vanilla JavaScript with ES modules.

## Deployment

Push to `main` branch to deploy via GitHub Pages. The app is configured to run from the `/image-converter/` subdirectory.

## Privacy

This app processes everything locally:

- Photos never leave your device
- No analytics or tracking
- No cookies
- Works completely offline once installed

## Browser Support

Works in all modern browsers that support:
- Web Workers
- ES Modules
- OffscreenCanvas
- Service Workers (for PWA/offline)

## License

MIT
