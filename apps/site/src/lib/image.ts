/**
 * 브라우저에서 이미지를 리사이즈·WebP 변환합니다.
 *
 * **왜 클라이언트에서 변환하나:** Cloudflare Images(서버 변환)는 유료입니다. 대신 캔버스로
 * 긴 변을 제한하고 WebP 로 인코딩해 올리면, 업로드 상한(6MB)·전송량·하객 로딩이 모두 작아집니다.
 * 서버는 `image/webp|jpeg|png` 만 허용하므로(assets.ts) 이미지에는 항상 WebP 를 만듭니다.
 *
 * AssetRef 는 원본 폭·높이를 요구합니다 — `<img width height>` 로 레이아웃 시프트를 막기 위해서라
 * 변환 **후** 실제 픽셀 크기를 함께 돌려줍니다.
 */
import type { AssetRef } from '@luvi/schema';

/** 긴 변 상한(px). 청첩장은 세로 폰이라 이 정도면 선명합니다. */
const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.82;
const MAX_BYTES = 6 * 1024 * 1024;

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 변환에 실패했습니다'))),
      'image/webp',
      quality,
    );
  });
}

/**
 * 파일 → 리사이즈된 WebP.
 * 6MB 를 넘으면 긴 변을 절반씩 줄여 재인코딩합니다 (초고해상도 원본 방어).
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);

  let maxEdge = MAX_EDGE;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이 브라우저에서는 이미지를 변환할 수 없습니다');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, WEBP_QUALITY);
    if (blob.size <= MAX_BYTES) return { blob, width, height };

    maxEdge = Math.round(maxEdge * 0.7);
  }
  throw new Error('사진 용량이 너무 큽니다. 더 작은 사진을 올려주세요');
}

/** 오디오는 변환하지 않고 크기만 확인합니다 (서버는 audio/mpeg 만 허용). */
export function checkAudio(file: File): void {
  if (file.type !== 'audio/mpeg') {
    throw new Error('MP3 음원만 올릴 수 있습니다');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('음원 용량이 너무 큽니다 (최대 6MB)');
  }
}

/** 업로드로 받은 key 와 변환 결과를 AssetRef 로 조립합니다. */
export function toAssetRef(key: string, size: { width: number; height: number }, alt?: string): AssetRef {
  return { key, w: size.width, h: size.height, ...(alt ? { alt } : {}) };
}
