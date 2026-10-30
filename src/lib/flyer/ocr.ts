'use client';

import { mergeOcrPasses, type TextLine } from './parseEventText';

/** Where scripts/copy-tesseract.cjs puts the worker and engine (same origin, so the CSP allows them). */
const ASSET_PATH = '/tesseract';
const TARGET_EDGE = 2400;
const MAX_EDGE = 3200;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That flyer image could not be opened.'));
    img.src = src;
  });
}

/**
 * Turns the flyer into black text on white, which OCR reads best: greyscale, contrast stretched,
 * inverted when the design is light text on a dark background, and enlarged so small print has
 * enough pixels.
 */
function prepareForOcr(img: HTMLImageElement) {
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(MAX_EDGE / long, Math.max(1, TARGET_EDGE / long));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const grey = new Uint8ClampedArray(px.length / 4);
  const histogram = new Uint32Array(256);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    grey[j] = g;
    histogram[g]++;
  }
  // Stretch between the 1st and 99th percentile so faint or neon text gets full contrast
  const total = grey.length;
  let lo = 0;
  let hi = 255;
  for (let sum = 0; lo < 255 && (sum += histogram[lo]) < total * 0.01; lo++);
  for (let sum = 0; hi > 0 && (sum += histogram[hi]) < total * 0.01; hi--);
  const range = Math.max(1, hi - lo);
  let mean = 0;
  for (let j = 0; j < total; j++) mean += grey[j];
  const invert = mean / total < 110;

  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    let v = ((grey[j] - lo) * 255) / range;
    if (invert) v = 255 - v;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

type OcrPage = { blocks: { paragraphs: { lines: { text: string; confidence: number; bbox: { y0: number; y1: number } }[] }[] }[] | null };

function linesOf(page: OcrPage): TextLine[] {
  return (page.blocks ?? [])
    .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
    .map((l) => ({ text: l.text.replace(/\s+/g, ' ').trim(), height: l.bbox.y1 - l.bbox.y0, confidence: l.confidence }));
}

/**
 * Reads the flyer's text in the browser. Two passes: one that follows the page layout, and a
 * sparse one that finds text scattered over a designed poster; mergeOcrPasses combines them.
 */
export async function readFlyerText(dataUri: string, onProgress?: (fraction: number) => void): Promise<TextLine[]> {
  const { createWorker } = await import('tesseract.js');
  let pass = 0;
  const passes = 2;
  const worker = await createWorker('eng', 1, {
    workerPath: `${ASSET_PATH}/worker.min.js`,
    corePath: ASSET_PATH,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.((pass + m.progress) / passes);
    },
  });
  try {
    const canvas = prepareForOcr(await loadImage(dataUri));
    const results: TextLine[][] = [];
    for (const psm of ['3', '11']) {
      await worker.setParameters({ tessedit_pageseg_mode: psm as never, preserve_interword_spaces: '1' });
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      results.push(linesOf(data as unknown as OcrPage));
      pass++;
    }
    return mergeOcrPasses(results);
  } finally {
    await worker.terminate();
  }
}
