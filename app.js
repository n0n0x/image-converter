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
  activeWorkers = Math.min(WORKER_COUNT, fileQueue.length);
  for (let i = 0; i < activeWorkers; i++) {
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
  console.error('Worker error:', e.message, 'at', e.filename, 'line', e.lineno);
  const worker = e.target;
  processedCount++;
  updateProgress();
  processNextFile(worker);
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
