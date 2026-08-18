/**
 * classic2 안에서만 쓰는 공통 조각.
 *
 * 이 디자인은 모든 섹션이 **필기체 영문 제목 + 자간 넓은 국문 라벨** 로 시작합니다.
 * 섹션마다 같은 마크업을 적으면 자간·크기가 조금씩 어긋나므로 여기 한 곳에 둡니다.
 * (classic1 의 `components/common/SectionHeading` 은 🐾·로즈 톤 전용이라 함께 쓰지 않습니다)
 */

interface HeadingProps {
  /** 필기체로 크게 쓰는 영문 (예: Invitation) */
  script: string;
  /** 그 아래 자간 넓은 국문 라벨 (예: 초대합니다) */
  label: string;
  className?: string;
}

export function Heading({ script, label, className = '' }: HeadingProps) {
  return (
    <div className={className}>
      <div className="font-pinyon text-[40px] leading-none text-c2-sage-deep">{script}</div>
      <div className="mt-2 text-[10.5px] tracking-[0.36em] text-c2-ink-soft">{label}</div>
    </div>
  );
}

/** 골드 실선 사이에 꽃 하나 — 문단 사이 구분선 */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3.5 text-c2-gold ${className}`}>
      <span className="h-px w-10 bg-c2-gold opacity-50" />
      <span className="text-[11px]">❀</span>
      <span className="h-px w-10 bg-c2-gold opacity-50" />
    </div>
  );
}
