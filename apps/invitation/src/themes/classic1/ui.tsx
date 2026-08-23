/**
 * 로즈 클래식 안에서만 쓰는 공통 조각.
 *
 * 카드 문구는 사용자가 넣고 지우는 **목록**이라(`@luvi/schema` 의 `sectionText.ts`) 섹션
 * 마크업에 자리를 박지 않습니다. 대신 역할(윗줄·제목·안내)마다 **이 디자인의 타이포**를
 * 여기 한 곳에 두고, 섹션은 목록만 넘깁니다 — 테마마다 크기·색을 다시 적으면 한쪽만 바뀝니다.
 */
import { CardText, type CardTextProps, type RoleClass } from '@/components/common/CardText';

/** 역할 → 로즈 클래식의 타이포. 여백은 자리(zone)의 `className` 이 정합니다 */
const ROLE: RoleClass = {
  eyebrow: 'font-myeongjo text-xs tracking-[0.34em] text-rose-deep',
  title: 'font-cormorant text-[30px] font-medium text-ink',
  note: 'text-xs text-ink-soft',
};

/**
 * 카드마다 안내 문구의 크기가 조금씩 다릅니다 (달력 아래는 크고, 오시는 길 아래는 작습니다).
 * 그 차이만 `override` 로 받습니다 — 전부 같은 값으로 통일하면 기존 청첩장의 화면이 바뀝니다.
 */
export function SectionText({
  override,
  ...rest
}: Omit<CardTextProps, 'roleClass'> & { override?: Partial<RoleClass> }) {
  return <CardText {...rest} roleClass={override ? { ...ROLE, ...override } : ROLE} />;
}
