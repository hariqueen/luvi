/**
 * 색 고르기 — 추천 색 · 최근 사용 · 스포이드(색상표) · HEX 입력.
 *
 * 커버 문구 색과 섹션 배경색이 **같은 컨트롤**을 씁니다. 두 개를 따로 만들면 한쪽에만
 * 스포이드가 생기거나 최근 색이 안 뜨는 식으로 갈립니다. 다른 것은 추천 색 목록
 * (`presets`)과 '기본으로 되돌리기'(`onClear`)뿐입니다.
 *
 * 예전에는 추천 색 4개 중 하나만 고를 수 있었습니다. 청첩장 색을 사진·테마에 맞추고
 * 싶은 사람에게는 그 4개가 곧 막다른 길이라, 네 가지 경로를 나란히 둡니다:
 *
 *  1. **추천 색** — 대부분은 여기서 끝납니다. 고민을 없애는 바로가기.
 *  2. **최근 사용** — 다른 곳에서 방금 쓴 색을 그대로. 색을 맞추려고 HEX 를 다시
 *     치거나 색상표에서 눈대중으로 찾는 일을 없앱니다 (`lib/recentColors.ts`).
 *  3. **스포이드** — 누르면 OS 색상표가 열려 마우스로 집습니다. 실제로는 숨긴
 *     `<input type="color">` 를 아이콘 위에 겹쳐 둡니다. 직접 `.click()` 을 호출하면
 *     사파리 등에서 무시되는 경우가 있어, **투명한 실제 input 을 겹치는 방식**이
 *     어디서나 동작합니다.
 *  4. **HEX 입력** — '055AAF' 처럼 브랜드 색을 받아온 경우. 붙여넣기가 가장 빠릅니다.
 *
 * 🔴 HEX 입력은 **로컬 draft 상태**로 받습니다. 한 글자씩 곧바로 반영하면 '0' 만
 *    쳤을 때 색이 검정으로 튀거나, 정규화 결과가 입력칸으로 되돌아와 커서가 튑니다.
 *    다 읽을 수 있는 값이 됐을 때만 위로 올립니다.
 */
import { useEffect, useState } from 'react';
import { LAYER_COLORS, normalizeHexColor, toColorInputValue } from '@luvi/schema';
import { rememberColorSoon, useRecentColors } from '@/lib/recentColors';

export interface ColorPreset {
  value: string;
  label: string;
}

interface Props {
  /** 현재 색 (`#RRGGBB` 를 기대하지만 옛 문서의 다른 표기도 깨지지 않게 다룹니다) */
  value: string;
  onChange: (color: string) => void;
  /** 추천 색. 기본값은 커버 문구용(사진 위에서 실패가 적은 색) */
  presets?: readonly ColorPreset[];
  /**
   * '기본' 칩을 함께 보여주고, 누르면 이걸 부릅니다 — 고른 색을 지워 원래 색으로
   * 되돌리는 길입니다. 넘기지 않으면 칩이 없습니다 (커버 문구는 '색 없음' 이 없습니다).
   */
  onClear?: () => void;
  /** '기본' 칩 문구 (예: '디자인 기본') */
  clearLabel?: string;
  /**
   * 좁은 칸에서 **여러 줄로 접히게** 할지.
   *
   * 기본은 한 줄입니다 — 커버 툴바는 가로로 스크롤되는 한 줄이라(`overflow-x-auto`)
   * 여기서 접히면 툴바가 두세 줄로 불어나 캔버스를 덮습니다. 반대로 폼 안(섹션 배경색)은
   * 좁은 화면에서 접혀야 오른쪽 끝의 HEX 칸이 잘리지 않습니다.
   */
  wrap?: boolean;
}

export function ColorControl({
  value,
  onChange,
  presets = LAYER_COLORS,
  onClear,
  clearLabel = '기본',
  wrap = false,
}: Props) {
  /** 입력칸에 보이는 문자열. '#' 없이 6자리로 보여줍니다 (붙여넣기 형태와 같게) */
  const [draft, setDraft] = useState(() => hexDigits(value));
  const recents = useRecentColors();

  /**
   * 추천 색·스포이드로 색이 바뀌면 입력칸도 따라가야 합니다.
   * 반대로 타이핑 중(draft 가 곧 value)일 때는 아무 일도 일어나지 않습니다.
   */
  useEffect(() => {
    setDraft(hexDigits(value));
  }, [value]);

  const current = normalizeHexColor(value);

  /**
   * 색을 위로 올리면서 최근 목록에도 남깁니다.
   *
   * 추천 색으로 이미 한 칸을 차지한 색은 기억하지 않습니다 — 같은 색이 한 줄에 두 번
   * 뜨면 3칸짜리 최근 목록이 아무 정보도 주지 않습니다.
   */
  const pick = (color: string) => {
    onChange(color);
    if (!presets.some((p) => p.value === color)) rememberColorSoon(color);
  };

  const commitDraft = (next: string) => {
    setDraft(next);
    const normalized = normalizeHexColor(next);
    if (normalized) pick(normalized);
  };

  /** 최근 목록에서 추천 색과 겹치는 것은 뺍니다 (같은 줄에 같은 색을 두 번 두지 않습니다) */
  const recentSwatches = recents.filter((c) => !presets.some((p) => p.value === c));

  return (
    <div
      className={`flex items-center gap-1 rounded-lg bg-surface-sunken px-1.5 py-1 ${
        wrap ? 'flex-wrap' : 'flex-none'
      }`}
    >
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className={`flex-none rounded-md border px-2 py-1 text-[11px] ${
            current === null
              ? 'border-gold bg-cream text-gold-deep'
              : 'border-line-strong bg-white text-ink-soft'
          }`}
        >
          {clearLabel}
        </button>
      )}

      {presets.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-label={c.label}
          title={c.label}
          onClick={() => pick(c.value)}
          className={`h-5 w-5 flex-none rounded-full border ${
            current === c.value ? 'border-gold ring-2 ring-gold/40' : 'border-line-strong'
          }`}
          style={{ background: c.value }}
        />
      ))}

      {/* 최근 사용 — 추천 색과 헷갈리지 않게 가느다란 칸막이를 둡니다 */}
      {recentSwatches.length > 0 && (
        <>
          <span className="mx-0.5 h-4 w-px flex-none bg-line-strong/60" aria-hidden />
          {recentSwatches.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`최근 사용한 색 ${c}`}
              title={`최근 사용 ${c}`}
              onClick={() => pick(c)}
              className={`h-5 w-5 flex-none rounded-full border ${
                current === c ? 'border-gold ring-2 ring-gold/40' : 'border-line-strong'
              }`}
              style={{ background: c }}
            />
          ))}
        </>
      )}

      {/* 스포이드 — 아이콘 위에 투명한 color input 을 겹쳐 두어 탭하면 색상표가 열린다 */}
      <span
        className={`relative flex h-5 w-5 flex-none items-center justify-center overflow-hidden rounded-full border ${
          current && !presets.some((c) => c.value === current) && !recentSwatches.includes(current)
            ? 'border-gold ring-2 ring-gold/40'
            : 'border-line-strong'
        }`}
        style={{ background: current ?? '#FFFFFF' }}
        title="색상표에서 고르기"
      >
        <EyedropperIcon />
        <input
          type="color"
          aria-label="색상표에서 고르기"
          value={toColorInputValue(value)}
          onChange={(e) => pick(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>

      {/* HEX 직접 입력 — 6자리(또는 3자리)를 다 채우면 반영된다 */}
      <label className="flex flex-none items-center gap-0.5 rounded-md border border-line bg-white pl-1.5">
        <span className="text-[11px] text-muted">#</span>
        <input
          value={draft}
          aria-label="색상 코드 (HEX)"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={6}
          placeholder="055AAF"
          onChange={(e) => commitDraft(e.target.value.replace(/[^0-9a-fA-F#]/g, '').toUpperCase())}
          // 읽을 수 없는 값을 남긴 채 떠나면 현재 색으로 되돌려, 입력칸이 거짓말하지 않게 한다
          onBlur={() => setDraft(hexDigits(value))}
          className="w-[62px] bg-transparent py-1 pr-1.5 text-[12px] tracking-[.06em] outline-none"
        />
      </label>
    </div>
  );
}

/** 표시용: '#' 을 뗀 6자리. 읽을 수 없는 색이면 빈 칸으로 둡니다 */
function hexDigits(color: string): string {
  const normalized = normalizeHexColor(color);
  return normalized ? normalized.slice(1) : '';
}

/** 스포이드 아이콘. 배경이 사용자가 고른 색이라, 검은 헤일로 위에 흰 선을 얹어 어느 색에서도 보이게 한다 */
function EyedropperIcon() {
  const d = 'm2 22 1-1h3l9-9M3 21v-3l9-9m3-3 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z';
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path d={d} fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
