/**
 * classic2 안에서만 쓰는 공통 조각.
 *
 * 이 디자인은 모든 섹션이 **필기체 영문 윗줄 + 자간 넓은 국문 제목** 으로 시작합니다.
 * 섹션마다 같은 값을 적으면 자간·크기가 조금씩 어긋나므로 여기 한 곳에 둡니다.
 * (로즈 클래식은 `classic1/ui.tsx` 에 자기 타이포가 따로 있습니다 — 🐾·로즈 톤 전용)
 */
import { CardText, type CardTextProps, type RoleClass } from '@/components/common/CardText';


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

/**
 * 카드 문구 — 세이지 가든의 타이포.
 *
 * 이 디자인은 카드마다 **필기체 영문(윗줄) + 자간 넓은 국문 라벨(제목)** 로 시작합니다.
 * 예전에는 그 두 줄이 `Heading` 안에 붙어 있었는데, 문구가 목록이 되면서(사용자가 지우거나
 * 순서를 바꿀 수 있음) 두 줄을 따로 그려야 해서 역할별 클래스로 풀었습니다.
 * 그래서 예전의 `Heading`(script+label 한 덩어리)은 지웠습니다 — 목록이 그 자리를 대신합니다.
 */
const ROLE: RoleClass = {
  eyebrow: 'font-pinyon text-[40px] leading-none text-c2-sage-deep',
  title: 'text-[10.5px] tracking-[0.36em] text-c2-ink-soft',
  note: 'font-myeongjo text-[13px] text-c2-ink-soft',
};

export function SectionText({
  override,
  ...rest
}: Omit<CardTextProps, 'roleClass'> & { override?: Partial<RoleClass> }) {
  return <CardText {...rest} roleClass={override ? { ...ROLE, ...override } : ROLE} />;
}
