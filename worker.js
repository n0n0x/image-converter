// DOM shim for worker environment
self.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      const canvas = new OffscreenCanvas(1, 1);
      // Shim toBlob to use convertToBlob (OffscreenCanvas API)
      canvas.toBlob = function(callback, type, quality) {
        this.convertToBlob({ type, quality }).then(callback);
      };
      return canvas;
    }
    throw new Error(`Cannot create element: ${tag}`);
  }
};

let heicTo = null;

self.onmessage = async (e) => {
  const { arrayBuffer, fileName, quality } = e.data;
  const startTime = performance.now();

  try {
    // Lazy load the library
    if (!heicTo) {
      const module = await import('https://esm.sh/heic-to@1.1.0');
      heicTo = module.heicTo;
    }

    const blob = await heicTo({
      blob: new Blob([arrayBuffer]),
      type: 'image/jpeg',
      quality: quality
    });

    const conversionTime = performance.now() - startTime;
    // Try to get memory usage (available in some browsers)
    const memoryUsage = self.performance?.memory?.usedJSHeapSize || null;

    self.postMessage({ blob, fileName, conversionTime, memoryUsage });
  } catch (error) {
    self.postMessage({ error: error.message || String(error), fileName });
  }
};
