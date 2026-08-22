/**
 * 섹션 배경색 덧칠 — 에디터에서 고른 색(`core.design.sectionBg`)을 그 섹션에만 입힙니다.
 *
 * 섹션 컴포넌트를 고치지 않고 **감싸서** 칠합니다:
 *   · 래퍼가 고른 색을 깔고
 *   · 안쪽 `<section>` 의 배경(색·그라데이션)을 투명으로 눌러 그 색이 보이게 합니다
 *
 * `[&>section]:bg-transparent` 는 `.bg-white`(클래스 1개)보다 특이성이 높아(클래스+요소)
 * 섹션이 무슨 배경 클래스를 쓰든 이깁니다. `bg-none` 은 그라데이션(background-image)용입니다
 * — classic1 미니게임처럼 그라데이션 배경인 섹션은 색만 눌러도 그대로 남습니다.
 *
 * 🔴 테마마다 이 배선을 다시 적지 않습니다. 한쪽 테마만 감싸면 그 디자인에서는 색을
 *    골라도 화면이 그대로인데, 에디터에는 색이 들어가 있어 원인을 찾기 어렵습니다.
 *
 * 색이 정해지지 않은 섹션은 **DOM 을 늘리지 않고** 자식을 그대로 돌려줍니다.
 */
import type { ReactNode } from 'react';
import type { SectionKey } from '@luvi/schema';
import { useInvitation } from '@/lib/invitationContext';

export function SectionSkin({ section, children }: { section: SectionKey; children: ReactNode }) {
  const { sectionBg } = useInvitation();
  const color = sectionBg[section];
  if (!color) return <>{children}</>;

  return (
    <div
      // --section-bg: 섹션 안에서 배경색을 알아야 하는 곳(예: classic2 마무리의 사진 위
      // 덮개)이 같은 색을 쓰도록 넘겨줍니다. 덮개가 아이보리로 고정돼 있으면 고른 색이
      // 그 아래에서 흐려집니다.
      style={{ background: color, ['--section-bg' as string]: color }}
      className="[&>section]:bg-none [&>section]:bg-transparent"
    >
      {children}
    </div>
  );
}
