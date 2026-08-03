/**
 * 발행 스냅샷 (Workers KV) — 하객 트래픽이 Firestore 를 건드리지 않게 하는 층입니다.
 *
 * 하객이 청첩장을 열 때 **Firestore 읽기가 0회**여야 합니다. 무료 한도는 하루 50,000 읽기인데
 * 청첩장 한 장이 카톡으로 퍼지면 하루에 수천 뷰가 나옵니다. 엣지에서 KV 만 읽습니다.
 *
 * ─── 키 설계 ───────────────────────────────────────────────
 *
 * | 키 | 값 | 쓰는 시점 |
 * |----|----|----------|
 * | `SNAP:{slug}`        | `PublicInvitation` JSON | 발행 |
 * | `SLUG_MAP:{invId}`   | 현재 슬러그             | 발행 |
 * | `HOST_MAP:{host}`    | 슬러그                  | 핀 설정 |
 *
 * 스냅샷을 **청첩장 ID 가 아니라 슬러그로 키잉**합니다. ID 로 키잉하면 하객 요청마다
 * `slug → id` 조회가 한 번 더 필요해 **가장 뜨거운 경로의 KV 읽기가 2배**가 됩니다.
 * `SLUG_MAP` 은 슬러그가 바뀔 때 옛 스냅샷을 지우기 위한 역방향 참조입니다.
 *
 * 🔴 **자동저장 초안을 KV 에 쓰면 안 됩니다.** 무료 쓰기 한도가 하루 1,000회라
 * 편집 몇 시간에 소진됩니다. 초안은 Firestore 에만 둡니다. KV 쓰기는 **발행할 때만** 일어납니다.
 */
import type { PublicInvitation } from '@luvi/schema';

export const snapKey = (slug: string) => `SNAP:${slug}`;
export const slugMapKey = (invitationId: string) => `SLUG_MAP:${invitationId}`;
export const hostMapKey = (hostname: string) => `HOST_MAP:${hostname.toLowerCase()}`;

export async function readSnapshot(
  kv: KVNamespace,
  slug: string,
): Promise<PublicInvitation | null> {
  // type: 'json' 을 쓰면 KV 가 파싱까지 해줍니다 (문자열을 받아 JSON.parse 하는 것보다 빠릅니다)
  return kv.get<PublicInvitation>(snapKey(slug), 'json');
}

export interface PublishSnapshotInput {
  kv: KVNamespace;
  invitationId: string;
  snapshot: PublicInvitation;
  /** 슬러그가 바뀐 경우 옛 스냅샷을 지우기 위해 */
  previousSlug?: string | null;
  /** 기존 URL 유지용 핀 (예: 'luvi-wedding.pages.dev') */
  pinnedHost?: string | null;
}

/**
 * 발행 스냅샷을 갱신합니다. 쓰기는 최대 4회 (SNAP · SLUG_MAP · HOST_MAP · 옛 SNAP 삭제)
 * — 하루 1,000회 한도 안에서 넉넉합니다.
 */
export async function writeSnapshot(input: PublishSnapshotInput): Promise<void> {
  const { kv, invitationId, snapshot, previousSlug, pinnedHost } = input;

  await kv.put(snapKey(snapshot.slug), JSON.stringify(snapshot));
  await kv.put(slugMapKey(invitationId), snapshot.slug);

  if (previousSlug && previousSlug !== snapshot.slug) {
    // 옛 스냅샷을 남겨두면 예전 URL 이 낡은 내용을 계속 보여줍니다
    await kv.delete(snapKey(previousSlug));
  }

  if (pinnedHost) {
    await kv.put(hostMapKey(pinnedHost), snapshot.slug);
  }
}

/** 청첩장 삭제·발행취소 시 하객 화면을 함께 내립니다 */
export async function removeSnapshot(
  kv: KVNamespace,
  invitationId: string,
  slug: string | null,
  pinnedHost?: string | null,
): Promise<void> {
  if (slug) await kv.delete(snapKey(slug));
  await kv.delete(slugMapKey(invitationId));
  if (pinnedHost) await kv.delete(hostMapKey(pinnedHost));
}

export async function readPublishedSlug(
  kv: KVNamespace,
  invitationId: string,
): Promise<string | null> {
  return kv.get(slugMapKey(invitationId), 'text');
}

/** 핀 걸린 호스트(기존에 공유된 URL)로 들어온 요청을 슬러그로 바꿉니다 */
export async function readHostSlug(kv: KVNamespace, hostname: string): Promise<string | null> {
  return kv.get(hostMapKey(hostname), 'text');
}
