/** 섹션 상단 공통 헤더: 🐾 EYEBROW + Cormorant 제목 */
import type { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <div
      className={`font-myeongjo text-rose-deep text-xs tracking-[0.34em] ${className}`}
    >
      {children}
    </div>
  );
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  /** 제목 폰트 크기 (px). 기본 30 */
  titleSize?: number;
}

export function SectionHeading({ eyebrow, title, titleSize = 30 }: SectionHeadingProps) {
  return (
    <>
      <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
      <div
        className="font-cormorant font-medium text-ink"
        style={{ fontSize: titleSize }}
      >
        {title}
      </div>
    </>
  );
}
