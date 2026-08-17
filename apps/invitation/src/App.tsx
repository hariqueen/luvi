/**
 * 청첩장 뷰어의 진입점 — 발행 스냅샷을 슬러그로 받아 그립니다.
 *
 * 경로는 `/i/{slug}` 입니다 (Vite base '/i/'). 여기서 slug 를 뽑아
 * `GET /api/public/i/:slug` 로 발행본을 받고, 어댑터로 표시값으로 바꿔 컨텍스트에 싣습니다.
 * 이 파일은 화면을 그리지 않습니다 — themeId 로 어떤 테마를 그릴지만 고릅니다.
 *
 * **미리보기 모드(`?preview=1`)**: 에디터가 iframe 으로 이 페이지를 띄우고, 편집 중인 초안을
 * `postMessage` 로 계속 보내줍니다. 그럼 API 를 부르지 않고 그 초안을 실시간으로 렌더합니다 —
 * 갤러리 추가/삭제·문구 수정 등이 우측 미리보기에 즉시 반영됩니다. (에디터와 같은 오리진)
 */
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { PublicInvitation } from '@luvi/schema';
import { THEMES, isThemeId } from '@/themes/registry';
import { InvitationProvider } from '@/lib/invitationContext';
import { adaptInvitation } from '@/lib/adapter';
import { googleCalendarUrl, weddingCalendarEvent } from '@/lib/calendar';
import { BASE, env } from '@/lib/env';

/** 현재 경로에서 슬러그를 뽑습니다 ('/i/our-wedding' → 'our-wedding') */
function slugFromPath(): string {
  let path = window.location.pathname;
  if (path.startsWith(BASE)) path = path.slice(BASE.length);
  return decodeURIComponent(path.split('/')[0] ?? '');
}

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; pub: PublicInvitation };

const isPreview = new URLSearchParams(window.location.search).has('preview');

export default function App() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    // 미리보기 모드: API 를 부르지 않고 에디터가 보내는 초안을 그대로 렌더한다
    if (isPreview) {
      const onMsg = (e: MessageEvent) => {
        // 같은 오리진(에디터)만 신뢰
        if (e.origin !== window.location.origin) return;
        const data = e.data as { __luviPreview?: boolean; pub?: PublicInvitation } | null;
        if (data && data.__luviPreview && data.pub) setLoad({ state: 'ready', pub: data.pub });
      };
      window.addEventListener('message', onMsg);
      // 준비됐다고 부모(에디터)에게 알림 → 에디터가 현재 초안을 보내준다
      window.parent?.postMessage({ __luviPreviewReady: true }, window.location.origin);
      return () => window.removeEventListener('message', onMsg);
    }

    const slug = slugFromPath();
    if (!slug) {
      setLoad({ state: 'error', message: '청첩장 주소가 없습니다.' });
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`${env.apiBase}/public/i/${encodeURIComponent(slug)}`);
        const json = (await res.json()) as
          | { ok: true; data: PublicInvitation }
          | { ok: false; error: { message: string } };
        if (!alive) return;
        if (res.ok && json.ok) setLoad({ state: 'ready', pub: json.data });
        else setLoad({ state: 'error', message: json.ok ? '불러오기 실패' : json.error.message });
      } catch {
        if (alive) setLoad({ state: 'error', message: '청첩장을 불러오지 못했습니다.' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const config = useMemo(
    () => (load.state === 'ready' && isThemeId(load.pub.themeId) ? adaptInvitation(load.pub) : null),
    [load],
  );

  // 로드되면 탭 제목을 맞추고, ?calendar=1 로 들어온 경우 구글 캘린더로 넘깁니다
  useEffect(() => {
    if (!config) return;
    if (isPreview) return; // 미리보기 iframe 에서는 제목 변경·캘린더 이동을 하지 않는다
    document.title = config.share.title || '모바일 청첩장';
    if (new URLSearchParams(window.location.search).has('calendar')) {
      try {
        window.location.replace(googleCalendarUrl(weddingCalendarEvent(config)));
      } catch {
        /* 일정 정보가 잘못돼도 청첩장은 그대로 보여줍니다 */
      }
    }
  }, [config]);

  if (load.state === 'error') {
    return (
      <div className="mx-auto flex min-h-screen max-w-page flex-col items-center justify-center gap-2 bg-ivory px-8 text-center">
        <p className="font-myeongjo text-[17px] text-ink">청첩장을 찾을 수 없어요</p>
        <p className="text-[13px] text-ink-soft">{load.message}</p>
      </div>
    );
  }

  if (!config) {
    return <div className="mx-auto min-h-screen max-w-page bg-ivory" aria-hidden />;
  }

  const Theme = THEMES[config.themeId];

  return (
    <InvitationProvider value={config}>
      <Suspense fallback={<div className="mx-auto min-h-screen max-w-page bg-ivory" aria-hidden />}>
        <Theme />
      </Suspense>
    </InvitationProvider>
  );
}
