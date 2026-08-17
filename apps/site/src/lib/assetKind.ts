/**
 * 필드 경로 → R2 업로드 종류(kind).
 *
 * 서버(`workers/api/src/lib/assets.ts`)가 kind 로 저장 경로(`inv/{id}/{kind}/...`)를 정하고,
 * 이미지/오디오 여부까지 검증합니다. 매니페스트 필드는 kind 를 따로 들고 있지 않으므로
 * 경로에서 유도합니다. 새 이미지 필드를 추가하면 여기 한 줄만 늘리면 됩니다.
 */
import type { SignUploadBody } from '@luvi/schema';

export type AssetKind = SignUploadBody['kind'];

/** 정확 경로 매핑. 배열 필드(gallery·fallingImages)는 원소가 아니라 필드 경로로 받습니다. */
const BY_PATH: Record<string, AssetKind> = {
  'core.cover.image': 'cover',
  'core.gallery': 'gallery',
  'core.greeting.bubbleImage': 'greeting',
  'core.share.image': 'og',
  'core.footer.image': 'footer',
  'core.bgm': 'audio',
  'theme.classic1.game.fallingImages': 'game',
  'theme.classic1.game.idleImage': 'game',
};

/** 경로로 kind 를 찾습니다. 못 찾으면 안전하게 'gallery'(일반 이미지)로 떨어집니다. */
export function assetKindForPath(path: string): AssetKind {
  return BY_PATH[path] ?? 'gallery';
}
