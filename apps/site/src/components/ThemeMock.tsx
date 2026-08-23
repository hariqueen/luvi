/**
 * 테마 커버를 흉내 낸 축소 목업.
 *
 * 실제 뷰어 화면이 아니라 **분위기용**입니다. 실제 렌더는 뷰어의 테마 CSS 가 합니다.
 * C3(디자인 선택)과 B5(템플릿 갤러리)가 같은 그림을 보여줘야 하므로 여기 한 곳에 둡니다 —
 * 두 화면이 각자 목업을 그리면 한쪽만 고쳐지고 인상이 달라집니다.
 *
 * 🔴 목업 안의 이름·날짜는 **예시**입니다. 실제 고객 정보를 쓰지 마세요.
 */
import type { ThemeDef } from '@luvi/schema';

export function ThemeMock({ theme }: { theme: ThemeDef }) {
  const { palette } = theme;

  if (theme.id === 'classic1') {
    // 사진 한 장이 화면을 가득 채우고, 그 위에 문구가 얹힙니다
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center"
        style={{
          background: `linear-gradient(180deg,#6f6259,#4a403a 46%,#241f1c), radial-gradient(circle at 50% 34%, ${palette.accent}55, transparent 62%)`,
          backgroundBlendMode: 'screen',
        }}
      >
        <span className="font-script text-[13px] leading-none text-white/80">The Wedding of</span>
        <span className="text-[19px] font-semibold leading-none tracking-[-.02em] text-white">
          신랑 · 신부
        </span>
        <span className="mt-0.5 h-px w-5" style={{ background: palette.accent }} />
        <span className="text-[8px] tracking-[.14em] text-white/85">2026. 10. 24 SAT</span>
      </div>
    );
  }

  // classic2 — 아이보리 여백 위 액자, 문구는 사진 밖에서 정돈됩니다
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-[7px] px-3 text-center"
      style={{ background: palette.base }}
    >
      <span className="text-[7px] tracking-[.3em]" style={{ color: '#8A8175' }}>
        OCTOBER 24, 2026
      </span>
      <span className="font-script text-[19px] leading-none" style={{ color: palette.ink }}>
        Groom &amp; Bride
      </span>
      <span
        className="mt-0.5 h-[52px] w-[42px] rounded-[3px]"
        style={{
          background: `linear-gradient(160deg,${palette.sunken},#d9d3c4)`,
          boxShadow: `0 0 0 1px #B49A63, inset 0 0 0 2px ${palette.base}`,
        }}
      />
      <span className="text-[7.5px] tracking-[.12em]" style={{ color: palette.accent }}>
        SATURDAY PM 1:00
      </span>
    </div>
  );
}
