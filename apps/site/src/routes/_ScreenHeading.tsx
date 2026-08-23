/**
 * 마케팅 화면(B2~B5) 공용 머리글 — 모노스페이스 라벨 + 큰 제목.
 *
 * 디자인 산출물은 이 라벨 자리에 화면 코드와 경로(`B2  /invitation`)를 박아뒀습니다.
 * 그건 캔버스에서 화면을 찾기 위한 표시라, 방문자에게 보일 페이지에는 옮기지 않습니다 —
 * 대신 같은 리듬(작은 모노 라벨 + 굵은 제목)을 유지하며 내용만 사람이 읽을 말로 바꿉니다.
 * 화면 코드는 각 라우트 파일 맨 위 주석에 남겨두었으니 대조는 거기서 합니다.
 */
import type { ReactNode } from 'react';

interface Props {
  /** 모노스페이스 라벨 (예: 'MOBILE') */
  label: string;
  title: string;
  /** 제목 아래 한 문단. 없으면 제목과 본문 사이 여백만 둡니다 */
  desc?: ReactNode;
  /** 어두운 배경(B3)에서는 라벨·제목 색을 뒤집습니다 */
  tone?: 'light' | 'dark';
}

export function ScreenHeading({ label, title, desc, tone = 'light' }: Props) {
  const dark = tone === 'dark';

  return (
    <header className={desc ? 'mb-10' : 'mb-11'}>
      <div className="flex items-baseline gap-3.5">
        <span
          className={`font-mono text-[11px] leading-none tracking-[.14em] ${
            dark ? 'text-gold' : 'text-gold-deep'
          }`}
        >
          {label}
        </span>
        <h1
          className={`text-[clamp(28px,3.4vw,36px)] font-extrabold tracking-[-.04em] ${
            dark ? 'text-paper' : 'text-ink'
          }`}
        >
          {title}
        </h1>
      </div>
      {desc && (
        <p
          className={`mt-3.5 max-w-[560px] text-[14.5px] leading-relaxed ${
            dark ? 'text-[#A8A399]' : 'text-muted'
          }`}
        >
          {desc}
        </p>
      )}
    </header>
  );
}
