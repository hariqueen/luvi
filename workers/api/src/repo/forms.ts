/**
 * 문의·예약 — 마케팅 화면의 폼입니다.
 *
 * 비로그인 공개 쓰기라 스팸이 들어옵니다. 여기서는 길이 제한과 IP 해시 기록만 하고,
 * 실제 차단은 Cloudflare 쪽 속도 제한 규칙에 맡깁니다 (무료 요금제에 규칙 1개가 포함됩니다).
 * Worker 안에서 카운터를 돌리면 KV 쓰기(하루 1,000회) 한도를 먼저 태웁니다.
 */
import { encode, fsTimestamp, type Firestore } from '../lib/firestore';

export type FormKind = 'inquiries' | 'bookings';

export async function createFormEntry(
  db: Firestore,
  kind: FormKind,
  data: Record<string, string>,
  ipHash: string,
): Promise<string> {
  const now = new Date().toISOString();

  const doc = await db.create('', kind, {
    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])),
    status: encode('new'),
    ipHash: encode(ipHash),
    createdAt: fsTimestamp(now),
  });

  return doc.id;
}
