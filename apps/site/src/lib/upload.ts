/**
 * 업로드 한 번(변환 → 서명 → R2 PUT)을 AssetRef 로 마무리합니다.
 *
 * api-client 의 `assets.upload` 가 서명·PUT 을 감싸므로 여기서는 변환과 AssetRef 조립만 합니다.
 */
import type { AssetRef } from '@luvi/schema';
import { api } from './api';
import { assetKindForPath } from './assetKind';
import { checkAudio, processImage, toAssetRef } from './image';

/** 이미지 파일 → 리사이즈·WebP 변환 후 업로드 → AssetRef. 실패 시 메시지를 던집니다. */
export async function uploadImageForPath(
  invitationId: string,
  path: string,
  file: File,
  alt?: string,
): Promise<AssetRef> {
  const processed = await processImage(file);
  const res = await api.assets.upload(invitationId, assetKindForPath(path), processed.blob);
  if (!res.ok) throw new Error(res.error.message);
  return toAssetRef(res.data.key, processed, alt);
}

/** MP3 음원 업로드 → AssetRef (오디오는 폭·높이가 없어 0 으로 둡니다). */
export async function uploadAudio(invitationId: string, file: File): Promise<AssetRef> {
  checkAudio(file);
  const res = await api.assets.upload(invitationId, 'audio', file);
  if (!res.ok) throw new Error(res.error.message);
  return { key: res.data.key, w: 0, h: 0 };
}
