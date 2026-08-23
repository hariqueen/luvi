/**
 * C3 디자인 선택 — "+ 새로 만들기" 를 누르면 여기로 옵니다.
 *
 * 고르면 **샘플 데이터가 채워진 초안**을 만듭니다. 빈 폼에서 시작하게 하면 이탈이 훨씬 큽니다 —
 * 완성된 화면을 먼저 보여주고 하나씩 바꾸게 합니다 (서버 `sampleContent()`).
 *
 * 🔴 디자인 목록은 `@luvi/schema` 의 `THEME_LIST` 입니다. 여기에 직접 적지 마세요 —
 *    서버(생성 요청 검증)와 뷰어(테마 등록소)가 같은 목록을 봐야 합니다.
 *
 * 미리보기 카드는 **각 디자인의 커버를 흉내 낸 목업**입니다 (`components/ThemeMock` — B5 갤러리와 공용).
 * 실제 화면이 아니라 분위기용이며, 만든 직후 에디터 가운데에 실제 뷰어가 그대로 뜹니다.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { THEME_LIST, type ThemeId } from '@luvi/schema';
import { ThemeMock } from '@/components/ThemeMock';
import { api } from '@/lib/api';
import { logEvent } from '@/lib/log';

export default function NewInvitation() {
  const navigate = useNavigate();
  /** 만드는 중인 디자인 — 어느 버튼을 눌렀는지 그 버튼에만 표시합니다 */
  const [creating, setCreating] = useState<ThemeId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (themeId: ThemeId) => {
    if (creating) return; // 두 번 누르면 청첩장이 2개 만들어집니다
    setCreating(themeId);
    setError(null);

    const res = await api.invitations.create({ themeId });
    logEvent({
      kind: res.ok ? 'click' : 'error',
      name: 'invitation_create',
      ok: res.ok,
      detail: res.ok ? themeId : `${themeId} ${res.error.code} ${res.error.message}`,
      invitationId: res.ok ? res.data.id : null,
    });

    if (res.ok) {
      // replace — 뒤로 가기로 이 화면에 돌아와 또 만드는 일을 막습니다
      navigate(`/app/i/${res.data.id}/edit`, { replace: true });
      return;
    }
    setCreating(null);
    setError(res.error.message);
  };

  return (
    <section>
      <header>
        <h1 className="text-[clamp(24px,4vw,34px)] font-semibold leading-tight tracking-[-.03em]">
          어떤 디자인으로 시작할까요
        </h1>
        <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-muted">
          고르면 샘플 내용이 채워진 초안이 바로 만들어집니다. 사진·문구는 전부 바꿀 수 있고,
          섹션은 나중에 빼거나 순서를 바꿀 수 있어요.
        </p>
      </header>

      {error && (
        <div className="mt-6 rounded-2xl border border-line-strong bg-surface px-5 py-4 text-[13px] text-ink-soft">
          청첩장을 만들지 못했습니다 — {error}
          <br />
          <span className="text-muted">잠시 뒤 다시 눌러보세요.</span>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {THEME_LIST.map((theme) => {
          const busy = creating === theme.id;
          return (
            <article
              key={theme.id}
              className="flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface transition-colors hover:border-gold-soft"
            >
              {/*
                미리보기 — 기기 프레임 위쪽만 보이는 형태 (디자인 C3).
                목업 크기를 카드 폭에 비례시키지 않고 **고정**합니다 — 넓은 화면에서 늘어나면
                실제 청첩장 비율(430px 폭)과 달라져 잘못된 인상을 줍니다.
              */}
              <div
                className="flex h-[268px] items-end justify-center"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg,#F1ECE4 0 10px,#E9E3D8 10px 20px)',
                }}
              >
                <div className="h-[230px] w-[132px] overflow-hidden rounded-t-[18px] border border-b-0 border-line-strong shadow-[0_-10px_30px_-18px_rgba(40,32,20,.4)]">
                  <ThemeMock theme={theme} />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-5">
                <div className="flex items-baseline justify-between gap-2.5">
                  <h2 className="text-[19px] font-bold tracking-[-.03em] text-ink">{theme.name}</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[.1em] text-muted-faint">
                    {theme.id}
                  </span>
                </div>

                <p className="text-[13px] leading-relaxed text-ink-soft">{theme.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  {theme.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-surface-sunken px-2.5 py-1 text-[11px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="text-[12.5px] leading-relaxed text-muted">
                  9개 섹션 전부 포함 · 미니게임 · 방명록은 켜고 끌 수 있습니다
                </div>

                <button
                  type="button"
                  onClick={() => void start(theme.id)}
                  disabled={creating !== null}
                  className="mt-auto rounded-[9px] bg-ink py-3 text-[13px] text-paper-soft transition-opacity disabled:opacity-60"
                >
                  {busy ? '초안을 만드는 중…' : '이 디자인으로 시작'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/*
        디자인은 **만들 때 정해집니다.** 지금은 나중에 다른 디자인으로 바꾸는 기능이 없어
        (서버 초안 저장이 themeId 를 받지 않습니다) 그 사실을 여기서 미리 알려줍니다 —
        고른 뒤에 알게 되면 청첩장을 다시 만들어야 합니다.
      */}
      <p className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-5 text-[12.5px] leading-relaxed text-muted">
        디자인은 만들 때 정해지고, 지금은 나중에 바꿀 수 없습니다. 두 디자인을 다 보고 싶다면
        하나씩 만들어 비교한 뒤 쓰지 않을 초안을 지우세요 — 초안은 하객에게 보이지 않습니다.
      </p>
    </section>
  );
}
