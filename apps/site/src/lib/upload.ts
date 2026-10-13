/**
 * 업로드 한 번(변환 → 서명 → R2 PUT)을 AssetRef 로 마무리합니다.
 *
 * api-client 의 `assets.upload` 가 서명·PUT 을 감싸므로 여기서는 변환과 AssetRef 조립만 합니다.
 */
import type { AssetRef } from '@luvi/schema';
import { api } from './api';
import { assetKindForPath } from './assetKind';
import { checkAudio, processImage, processImagePair, toAssetRef } from './image';

/** 이미지 파일 → 리사이즈·WebP 변환 후 업로드 → AssetRef. 실패 시 메시지를 던집니다. */
export async function uploadImageForPath(
  invitationId: string,
  path: string,
  file: File,
  alt?: string,
): Promise<AssetRef> {
  const kind = assetKindForPath(path);
  // 갤러리만 작은 썸네일을 함께 올립니다 — 50장이 한 화면에 깔리는 유일한 곳입니다.
  // 커버·OG 처럼 한 장을 크게 쓰는 자리는 작은 복사본이 쓰이지 않아 저장만 늘립니다.
  if (kind !== 'gallery') {
    const processed = await processImage(file);
    const res = await api.assets.upload(invitationId, kind, processed.blob);
    if (!res.ok) throw new Error(res.error.message);
    return toAssetRef(res.data.key, processed, alt);
  }

  const { main, thumb } = await processImagePair(file);
  const res = await api.assets.upload(invitationId, kind, main.blob);
  if (!res.ok) throw new Error(res.error.message);

  const ref = toAssetRef(res.data.key, main, alt);
  if (!thumb) return ref;

  /*
    썸네일 업로드가 실패해도 사진은 올라간 것으로 둡니다 — 뷰어가 `thumb ?? key` 로
    떨어지므로 예전처럼 원본을 쓸 뿐입니다. 여기서 던지면 멀쩡히 올라간 원본이 버려집니다.
  */
  const thumbRes = await api.assets.upload(invitationId, kind, thumb.blob);
  return thumbRes.ok ? { ...ref, thumb: thumbRes.data.key } : ref;
}

/** MP3 음원 업로드 → AssetRef (오디오는 폭·높이가 없어 0 으로 둡니다). */
export async function uploadAudio(invitationId: string, file: File): Promise<AssetRef> {
  checkAudio(file);
  const res = await api.assets.upload(invitationId, 'audio', file);
  if (!res.ok) throw new Error(res.error.message);
  return { key: res.data.key, w: 0, h: 0 };
}
