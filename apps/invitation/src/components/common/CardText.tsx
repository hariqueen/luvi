/**
 * 카드 문구 그리기 — 블록 목록 하나를 화면에 얹습니다.
 *
 * 문구는 이제 "칸" 이 아니라 **목록**입니다(`@luvi/schema` 의 `sectionText.ts`). 사용자가
 * 넣고 지우고 순서를 바꿀 수 있으므로, 섹션 컴포넌트는 몇 줄이 올지 모릅니다. 그래서
 * 마크업에 문구 자리를 박지 않고 이 컴포넌트에 목록을 넘깁니다.
 *
 * 🔴 **블록이 없으면 아무것도 렌더하지 않습니다** (`null`). 예전에는 빈 문자열을 받아도
 *    래퍼 `<div className="mb-2">` 가 남아서, 문구를 지워도 **그 자리의 여백이 남았습니다.**
 *    "지웠는데 간격이 그대로" 는 지워지지 않은 것으로 읽힙니다.
 *
 * 크기·색·글꼴은 **디자인이** 정합니다 (`roleClass`). 블록에 값이 있을 때만 그걸 덮습니다 —
 * 손대지 않은 문구는 디자인을 바꾸면 같이 따라와야 합니다.
 *
 * `scale` 은 배율이라 `em` 으로 겁니다: 바깥 div 가 역할 크기(px)를 정하고, 안쪽 span 의
 * `1.2em` 이 그 크기의 1.2배가 됩니다. px 로 계산하면 역할 기본 크기를 여기서 또 알아야 합니다.
 */
import type { ReactNode } from 'react';
import type { SectionBlock, SectionKey, SectionTextRole, SectionZone } from '@luvi/schema';
import { IS_PREVIEW } from './PreviewSlot';

/** 역할 → 이 디자인의 타이포 클래스 */
export type RoleClass = Record<SectionTextRole, string>;

export interface CardTextProps {
  section: SectionKey;
  zone: SectionZone;
  blocks: SectionBlock[];
  roleClass: RoleClass;
  /** 이 자리 전체의 바깥 여백 (섹션이 정합니다) */
  className?: string;
  /** 블록 사이 간격. 기본 `gap-2` */
  gap?: string;
  /**
   * 마지막 블록 뒤에 붙는 것 — 방명록 건수 `(3)`, 갤러리의 '· 옆으로 넘겨 다음 사진' 처럼
   * **문구의 일부가 아니라 화면이 계산해 붙이는 것**입니다. 블록이 하나도 없으면 같이
   * 사라집니다 (문구를 지웠는데 괄호만 남아 있으면 고장으로 보입니다).
   */
  append?: ReactNode;
}

export function CardText({
  section,
  zone,
  blocks,
  roleClass,
  className = '',
  gap = 'gap-2',
  append,
}: CardTextProps) {
  if (blocks.length === 0) return null;

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {blocks.map((b, i) => (
        <div
          key={b.id}
          // 미리보기에서 이 글자를 탭하면 에디터가 그 블록을 열어줍니다 (PreviewSlot)
          data-preview-block={IS_PREVIEW ? `${section}:${zone}:${b.id}` : undefined}
          className={`${roleClass[b.role]}${
            IS_PREVIEW
              ? ' cursor-text rounded-[3px] outline-offset-[3px] hover:outline hover:outline-2 hover:outline-gold'
              : ''
          }`}
          style={{ textAlign: b.align, color: b.color }}
        >
          <span
            className="whitespace-pre-line"
            style={b.scale && b.scale !== 1 ? { fontSize: `${b.scale}em` } : undefined}
          >
            {b.text}
            {i === blocks.length - 1 && append}
          </span>
        </div>
      ))}
    </div>
  );
}
