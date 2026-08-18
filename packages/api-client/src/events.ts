/**
 * 클라이언트 이벤트 로거 — 하객 뷰어와 에디터가 같은 것을 씁니다.
 *
 * 설계에서 지킨 것:
 *
 *  1. **로그가 화면을 방해하지 않는다.** 전송 실패는 조용히 버립니다. await 하지 않습니다.
 *  2. **모아서 보낸다.** 클릭마다 요청을 날리면 Workers 무료 요청 한도를 로그가 먹습니다.
 *     1.5초 창으로 묶고, 페이지를 떠날 때 `sendBeacon` 으로 남은 것을 흘려보냅니다.
 *  3. **실패는 즉시 보낸다.** 실패 직후 사용자가 창을 닫아버리는 경우가 많습니다.
 *  4. **개인정보를 넣지 않는다.** 이름·이메일·전화번호 금지. `session` 은 탭 단위 난수입니다.
 */
import type { EventLogItem } from '@luvi/schema';

const FLUSH_MS = 1500;
const MAX_QUEUE = 20;
const SESSION_KEY = 'luvi.session';

/** 탭(세션) 단위 난수. 사람을 식별하지 않고 한 번의 방문을 잇는 용도입니다 */
function sessionId(): string {
  try {
    const found = sessionStorage.getItem(SESSION_KEY);
    if (found) return found;
    const next = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    // 시크릿 모드·저장소 차단 환경
    return 'nostore';
  }
}

export interface EventLoggerOptions {
  /** '/api' 또는 'https://…/api' */
  baseUrl: string;
  /** 이벤트마다 자동으로 붙일 값 (청첩장 id·슬러그 등) */
  context?: () => Partial<Pick<EventLogItem, 'invitationId' | 'slug'>>;
}

export interface EventLogger {
  /** 눌림·성공/실패 기록. 실패(ok === false)는 즉시 전송합니다 */
  log: (item: EventLogItem) => void;
  /** 대기 중인 것을 지금 보냅니다 */
  flush: () => void;
}

export function createEventLogger(opts: EventLoggerOptions): EventLogger {
  const url = `${opts.baseUrl}/events`;
  let queue: EventLogItem[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const send = (items: EventLogItem[], beacon: boolean) => {
    if (items.length === 0) return;
    const body = JSON.stringify({ events: items });
    try {
      // 페이지를 떠나는 순간에는 fetch 가 취소됩니다 — sendBeacon 만 살아남습니다
      if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        return;
      }
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* 로그는 실패해도 조용히 넘어갑니다 */
    }
  };

  const flush = (beacon = false) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const items = queue;
    queue = [];
    send(items, beacon);
  };

  if (typeof window !== 'undefined') {
    // pagehide 는 iOS 사파리에서 unload 대신 확실히 불립니다
    window.addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true);
    });
  }

  return {
    log(item) {
      const ctx = opts.context?.() ?? {};
      queue.push({
        session: sessionId(),
        path: typeof location !== 'undefined' ? location.pathname : undefined,
        ...ctx,
        ...item,
      });

      // 실패는 지금 보냅니다. 성공·조회는 묶어서 보냅니다
      if (item.ok === false || queue.length >= MAX_QUEUE) {
        flush();
        return;
      }
      if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
    },
    flush: () => flush(),
  };
}
