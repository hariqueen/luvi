/**
 * B5 템플릿 갤러리.
 *
 * 목록은 `@luvi/schema` 의 `THEME_LIST` 입니다 — C3(디자인 선택)·서버 검증과 같은 소스라
 * 여기에 디자인을 직접 적으면 안 됩니다. 카드 안 목업도 C3 와 같은 `ThemeMock` 을 씁니다.
 *
 * `/samples/:themeId` 로 들어오면 그 디자인을 위에 크게 펼칩니다 (딥링크 · 카드의 [자세히 보기]).
 *
 * 🔴 디자인 산출물에는 필터 칩 줄이 있었지만 옮기지 않았습니다. 디자인이 2개뿐인데 필터를 두면
 *    누르는 족족 1개만 남는 가짜 기능이 됩니다. 목록이 늘어나면 태그(`theme.tags`)로 붙이세요.
 * 🔴 라이브 데모(실제 뷰어 임베드)도 아직 없습니다. 뷰어는 **발행된** 청첩장(`/i/{slug}`)만
 *    그리므로, 데모를 붙이려면 공개용 샘플 청첩장을 하나 발행해 그 슬러그를 여기에 걸어야 합니다.
 */
import { Link, useParams } from 'react-router-dom';
import { THEME_LIST, type ThemeDef } from '@luvi/schema';
import { ThemeMock } from '@/components/ThemeMock';
import { useReveal } from '@/lib/reveal';
import { ScreenHeading } from './_ScreenHeading';

const HATCH = 'repeating-linear-gradient(135deg,#F1ECE4 0 10px,#E9E3D8 10px 20px)';

/** 딥링크로 들어온 디자인 — 크게 펼쳐 보여줍니다 */
function Spotlight({ theme }: { theme: ThemeDef }) {
  return (
    <div className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(288px,1fr))] items-center gap-[clamp(24px,3vw,44px)] rounded-[22px] border border-line bg-surface p-[clamp(24px,3.4vw,44px)]">
      <div className="flex items-end justify-center rounded-2xl py-8" style={{ background: HATCH }}>
        <div className="h-[300px] w-[172px] overflow-hidden rounded-t-[22px] border border-b-0 border-line-strong shadow-[0_-10px_30px_-18px_rgba(40,32,20,.4)]">
          <ThemeMock theme={theme} />
        </div>
      </div>

      <div>
        <div className="font-mono text-[11px] leading-none tracking-[.14em] text-gold-deep">
          {theme.id}
        </div>
        <h2 className="mt-3 text-[clamp(26px,3vw,34px)] font-extrabold tracking-[-.04em]">
          {theme.name}
        </h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">{theme.tagline}</p>
        <p className="mt-4 max-w-[460px] text-[13.5px] leading-[1.8] text-muted">
          {theme.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {theme.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-sunken px-2.5 py-1 text-[11px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link
            to="/app/new"
            className="rounded-full bg-ink px-[26px] py-[13px] text-[13.5px] text-paper-soft"
          >
            이 디자인으로 시작
          </Link>
          <Link
            to="/samples"
            className="rounded-full border border-line-strong bg-white px-[22px] py-[13px] text-[13.5px]"
          >
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Samples() {
  const { themeId } = useParams();
  useReveal();

  // 모르는 id 로 들어오면 기본 디자인으로 떨어뜨리지 않고 목록만 보여줍니다 —
  // 조용히 다른 디자인을 펼치면 링크를 잘못 봤다는 사실이 가려집니다.
  const selected = THEME_LIST.find((t) => t.id === themeId);

  return (
    <section className="border-t border-line">
      <div
        data-reveal
        className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] py-[clamp(56px,7vw,96px)]"
      >
        <ScreenHeading
          label="TEMPLATES"
          title="템플릿"
          desc={
            <>
              지금은 {THEME_LIST.length}개이고 계속 추가됩니다. 어느 쪽을 골라도 9개 섹션이 전부
              들어 있고, 사진·문구·색은 만든 뒤에 바꿀 수 있어요.
            </>
          }
        />

        {selected && <Spotlight theme={selected} />}

        {/*
          열 폭에 상한(340px)을 둡니다. auto-fit/1fr 로 두면 디자인이 2개뿐인 지금 카드가
          690px 까지 늘어나 목업 주위가 텅 빕니다. 디자인이 늘어나면 열이 알아서 채워집니다.
        */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,340px))] gap-5">
          {THEME_LIST.map((theme) => (
            <article
              key={theme.id}
              className={`flex flex-col overflow-hidden rounded-[18px] border bg-white transition-[transform,box-shadow,border-color] duration-[350ms] ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-1 hover:border-gold-soft hover:shadow-[0_22px_44px_-30px_rgba(40,32,20,.45)] ${
                theme.id === selected?.id ? 'border-gold-soft' : 'border-line'
              }`}
            >
              <div
                className="flex aspect-[4/3] items-end justify-center"
                style={{ background: HATCH }}
              >
                {/*
                  목업 크기는 카드 폭에 비례시키지 않고 고정합니다 — 넓은 화면에서 늘어나면
                  실제 청첩장 비율과 달라져 잘못된 인상을 줍니다 (C3 와 같은 이유).
                */}
                <div className="h-[210px] w-[120px] overflow-hidden rounded-t-2xl border border-b-0 border-[#E5DFD4] shadow-[0_-10px_30px_-16px_rgba(40,32,20,.35)]">
                  <ThemeMock theme={theme} />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 px-[22px] pb-[22px] pt-5">
                <div className="flex items-baseline justify-between gap-2.5">
                  <h2 className="text-[18px] font-bold tracking-[-.03em]">{theme.name}</h2>
                  <span className="font-mono text-[10px] leading-none tracking-[.1em] text-muted-soft">
                    {theme.id}
                  </span>
                </div>

                <p className="m-0 text-[13px] leading-[1.7] text-muted">{theme.tagline}</p>

                <div className="flex flex-wrap gap-1.5">
                  {theme.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-surface-sunken px-[9px] py-1 text-[11px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex gap-2 pt-1.5">
                  <Link
                    to={`/samples/${theme.id}`}
                    className="flex-1 rounded-[9px] border border-line-strong bg-white py-2.5 text-center text-[13px]"
                  >
                    자세히 보기
                  </Link>
                  <Link
                    to="/app/new"
                    className="flex-1 rounded-[9px] bg-ink py-2.5 text-center text-[13px] text-paper-soft"
                  >
                    이 디자인으로 시작
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
