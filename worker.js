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
