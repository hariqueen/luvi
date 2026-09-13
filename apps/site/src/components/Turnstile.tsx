/**
 * Cloudflare Turnstile 위젯 — 비로그인 문의 폼의 봇 차단.
 *
 * **왜 스크립트를 직접 붙이는가:** 위젯 하나 때문에 React 래퍼 패키지를 의존성에 넣을
 * 이유가 없습니다. 스크립트는 한 번만 로드하고, 언마운트 때 위젯을 지웁니다.
 *
 * 🔴 **사이트 키가 없으면 아무것도 그리지 않고 조용히 통과시킵니다.** 키가 빠졌다고
 *    문의 창구가 닫히면 안 됩니다. 대신 서버가 `TURNSTILE_SECRET` 유무로 판단하고,
 *    `/health` 의 `turnstile` 이 false 면 봇 검증이 꺼져 있다는 뜻입니다.
 */
import { useEffect, useRef } from 'react';
import { env } from '@/lib/env';

const SCRIPT_ID = 'cf-turnstile-script';
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void },
  ) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadScript(): Promise<void> {
  if (document.getElementById(SCRIPT_ID)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.id = SCRIPT_ID;
    el.src = SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Turnstile 스크립트를 불러오지 못했습니다'));
    document.head.appendChild(el);
  });
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!env.turnstileSiteKey) return;
    let cancelled = false;

    void (async () => {
      try {
        await loadScript();
        // 스크립트가 `window.turnstile` 을 붙일 때까지 잠깐 기다립니다
        for (let i = 0; i < 50 && !window.turnstile; i += 1) {
          await new Promise((r) => setTimeout(r, 100));
        }
        if (cancelled || !window.turnstile || !boxRef.current) return;

        widgetRef.current = window.turnstile.render(boxRef.current, {
          sitekey: env.turnstileSiteKey,
          callback: onToken,
          'expired-callback': () => onToken(''),
        });
      } catch (e) {
        // 위젯을 못 띄워도 폼은 그대로 씁니다 — 서버가 판단합니다
        console.warn('[turnstile]', e);
      }
    })();

    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          /* 이미 사라진 위젯 */
        }
      }
    };
  }, [onToken]);

  if (!env.turnstileSiteKey) return null;
  return <div ref={boxRef} className="min-h-[65px]" />;
}
