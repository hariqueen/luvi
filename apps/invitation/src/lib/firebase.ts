/**
 * Firebase Firestore 연동 (방명록·랭킹).
 * 원본의 CDN compat 스크립트를 모듈러 SDK로 이식했습니다.
 * env(VITE_FIREBASE_*)가 없거나 초기화가 실패하면 db=null을 반환하고,
 * 호출부(hook)는 자동으로 localStorage 폴백으로 동작합니다.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit as fbLimit,
  getDocs,
  addDoc,
  serverTimestamp,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore';
import type { GuestbookEntry, RankEntry } from './types';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (cfg.apiKey && cfg.projectId) {
  try {
    app = initializeApp(cfg);
    db = getFirestore(app);
  } catch (e) {
    console.warn('[wed] firebase 초기화 실패 — localStorage로 동작합니다.', e);
    db = null;
  }
} else {
  console.info('[wed] Firebase env 미설정 — localStorage로만 동작합니다.');
}

/** Firestore 사용 가능 여부 */
export const hasFirebase = (): boolean => db !== null;

const toMillis = (t: unknown): number =>
  t && typeof (t as Timestamp).toMillis === 'function'
    ? (t as Timestamp).toMillis()
    : Date.now();

const clamp = (s: string, n: number): string => String(s ?? '').trim().slice(0, n);

/** 랭킹 TOP 7 불러오기 (실패 시 null) */
export async function loadBoard(): Promise<RankEntry[] | null> {
  if (!db) return null;
  try {
    const q = query(collection(db, 'rankings'), orderBy('score', 'desc'), fbLimit(7));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const x = d.data();
      return {
        nick: x.nick as string,
        score: x.score as number,
        caught: (x.caught as number) || 0,
        ts: toMillis(x.createdAt),
      };
    });
  } catch (e) {
    console.warn('[wed] loadBoard', e);
    return null;
  }
}

/** 방명록 최근 50개 불러오기 (실패 시 null) */
export async function loadGuestbook(): Promise<GuestbookEntry[] | null> {
  if (!db) return null;
  try {
    const q = query(collection(db, 'guestbook'), orderBy('createdAt', 'desc'), fbLimit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const x = d.data();
      return { name: x.name as string, msg: x.msg as string, ts: toMillis(x.createdAt) };
    });
  } catch (e) {
    console.warn('[wed] loadGuestbook', e);
    return null;
  }
}

/** 랭킹 등록 */
export async function addRank(nick: string, score: number, caught: number): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'rankings'), {
      nick: clamp(nick, 20) || '익명 하객',
      score: Number(score) || 0,
      caught: Number(caught) || 0,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[wed] addRank', e);
  }
}

/** 방명록 등록 */
export async function addGuestbook(name: string, msg: string): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'guestbook'), {
      name: clamp(name, 20),
      msg: clamp(msg, 300),
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[wed] addGuestbook', e);
  }
}
