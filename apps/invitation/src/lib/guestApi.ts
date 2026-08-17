/**
 * 방명록·랭킹 REST 클라이언트 (하객용, 비로그인).
 *
 * 예전에는 뷰어가 Firebase SDK 로 Firestore 루트 컬렉션(`guestbook`/`rankings`)에 직접
 * 읽고 썼습니다. 청첩장이 2장이 되는 순간 **모든 청첩장이 같은 방명록을 공유**하는 구조였고,
 * 그래서 지금은 워커 API(`/api/invitations/{id}/…`)를 거칩니다. 얻는 것 세 가지:
 *
 *  1. 청첩장별 스코프 — 글이 `invitations/{id}/guestbook` 서브컬렉션에 들어갑니다.
 *  2. 숨김 처리 — 소유자가 숨긴 글은 서버가 걸러서 보냅니다 (보안 규칙으로는 불가능합니다).
 *  3. 도배 방어 — 서버가 IP 해시로 셉니다. 그리고 Firebase SDK(gzip 80KB)가 번들에서 빠집니다.
 *
 * 실패는 전부 조용히 넘깁니다 (`null` / `false`). 축하 메시지를 쓰다가 에러 화면을 보는 것보다
 * 로컬에 남기고 넘어가는 편이 낫습니다 — 호출부가 localStorage 로 폴백합니다.
 */
import { env } from './env';
import type { GuestbookEntry, RankEntry } from './types';

/** 서버 응답 봉투 */
type Envelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };

interface ApiGuestbookEntry {
  id: string;
  name: string;
  msg: string;
  hidden: boolean;
  /** ISO 문자열 */
  createdAt: string;
}

interface ApiRankEntry {
  id: string;
  nick: string;
  score: number;
  caught: number;
  createdAt: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${env.apiBase}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    const json = (await res.json()) as Envelope<T>;
    if (!res.ok || !json.ok) return null;
    return json.data;
  } catch {
    return null;
  }
}

/** ISO 문자열 → epoch ms. 파싱 실패 시 0 (정렬에서 맨 뒤로 갑니다) */
const toMs = (iso: string): number => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

/** 방명록 목록 (실패 시 null → 호출부가 로컬 값을 유지합니다) */
export async function fetchGuestbook(
  invitationId: string,
  limit = 50,
): Promise<GuestbookEntry[] | null> {
  const data = await call<ApiGuestbookEntry[]>(
    `/invitations/${encodeURIComponent(invitationId)}/guestbook?limit=${limit}`,
  );
  if (!data) return null;
  return data.map((e) => ({ name: e.name, msg: e.msg, ts: toMs(e.createdAt) }));
}

/** 방명록 등록. 성공 여부만 돌려줍니다 (도배 차단·검증 실패 포함해 false) */
export async function postGuestbook(
  invitationId: string,
  name: string,
  msg: string,
): Promise<boolean> {
  const data = await call<ApiGuestbookEntry>(
    `/invitations/${encodeURIComponent(invitationId)}/guestbook`,
    { method: 'POST', body: JSON.stringify({ name, msg }) },
  );
  return data !== null;
}

/** 랭킹 목록 (점수 내림차순, 서버가 정렬해 보냅니다) */
export async function fetchRankings(invitationId: string): Promise<RankEntry[] | null> {
  const data = await call<ApiRankEntry[]>(
    `/invitations/${encodeURIComponent(invitationId)}/rankings`,
  );
  if (!data) return null;
  return data.map((e) => ({ nick: e.nick, score: e.score, caught: e.caught, ts: toMs(e.createdAt) }));
}

/** 랭킹 등록 */
export async function postRank(
  invitationId: string,
  nick: string,
  score: number,
  caught: number,
): Promise<boolean> {
  const data = await call<ApiRankEntry>(
    `/invitations/${encodeURIComponent(invitationId)}/rankings`,
    { method: 'POST', body: JSON.stringify({ nick, score, caught }) },
  );
  return data !== null;
}
