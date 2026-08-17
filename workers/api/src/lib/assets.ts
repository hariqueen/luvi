/**
 * R2 업로드 — Worker 를 통과시킵니다 (presigned URL 을 쓰지 않습니다).
 *
 * **왜 presigned 가 아닌가:** R2 의 presigned URL 은 S3 호환 API 라 별도 액세스 키
 * (Access Key ID / Secret)를 만들어 시크릿으로 넣고 SigV4 를 직접 구현해야 합니다.
 * Worker 에 이미 R2 바인딩이 있으니 서명 없이 바로 쓸 수 있고, 관리할 키가 줄어듭니다.
 * 업로드 상한이 6MB 라 Worker 를 거치는 비용도 문제되지 않습니다.
 *
 * 흐름: `POST /api/assets/sign` (권한 확인 + HMAC 토큰 발급)
 *      → `PUT /api/assets/upload?key=…&token=…` (토큰 검증 후 R2 에 기록)
 */

/** 브라우저에서 리사이즈·WebP 변환한 뒤 올립니다 (Cloudflare Images 는 유료) */
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export type AssetKind =
  | 'cover'
  | 'gallery'
  | 'greeting'
  | 'game'
  | 'og'
  | 'audio'
  | 'footer'
  /** 낙하 연출에 쓰는 이미지 (떨어지는 그림) */
  | 'effects';

const KINDS = new Set<AssetKind>([
  'cover',
  'gallery',
  'greeting',
  'game',
  'og',
  'audio',
  'footer',
  'effects',
]);

/**
 * 허용 콘텐츠 타입.
 *
 * 🔴 **SVG 와 HTML 은 절대 허용하지 않습니다.** 에셋은 우리 도메인(`cdn.luv-ai.co.kr`)에서
 *    서빙되므로, SVG 안의 `<script>` 가 우리 오리진 권한으로 실행됩니다 (저장형 XSS).
 *    허용 목록 방식이라 새 타입을 추가할 때만 이 목록을 늘립니다.
 */
const CONTENT_TYPES: Record<string, { ext: string; audio: boolean }> = {
  'image/webp': { ext: 'webp', audio: false },
  'image/jpeg': { ext: 'jpg', audio: false },
  'image/png': { ext: 'png', audio: false },
  'audio/mpeg': { ext: 'mp3', audio: true },
};

export interface AssetKeyInput {
  invitationId: string;
  kind: string;
  contentType: string;
}

export class AssetError extends Error {}

/** 청첩장 ID 는 문서 ID 라 Firestore 가 만든 값이지만, 경로에 넣기 전에 한 번 더 확인합니다 */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function buildAssetKey(input: AssetKeyInput): string {
  if (!ID_PATTERN.test(input.invitationId)) {
    throw new AssetError('청첩장을 찾을 수 없습니다');
  }
  if (!KINDS.has(input.kind as AssetKind)) {
    throw new AssetError('업로드할 수 없는 항목입니다');
  }

  const type = CONTENT_TYPES[input.contentType];
  if (!type) {
    throw new AssetError('지원하지 않는 파일 형식입니다 (JPG · PNG · WebP · MP3)');
  }
  if (type.audio !== (input.kind === 'audio')) {
    // 이미지 칸에 오디오를 넣거나 그 반대인 경우
    throw new AssetError('파일 형식이 항목과 맞지 않습니다');
  }

  // 파일명이 매번 달라 캐시를 영구(immutable)로 걸 수 있습니다 —
  // 같은 이름을 재사용하면 하객 브라우저에 옛 사진이 남습니다
  return `inv/${input.invitationId}/${input.kind}/${crypto.randomUUID()}.${type.ext}`;
}

export function isAllowedContentType(contentType: string): boolean {
  return contentType in CONTENT_TYPES;
}

/** 키에서 청첩장 ID 를 되꺼냅니다 — 업로드 시점에 소유권을 다시 확인하기 위해 */
export function invitationIdFromKey(key: string): string | null {
  const m = /^inv\/([A-Za-z0-9_-]{1,64})\//.exec(key);
  return m?.[1] ?? null;
}

/** 콘텐츠 해시가 아니라 UUID 를 쓰므로 파일은 절대 바뀌지 않습니다 */
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
