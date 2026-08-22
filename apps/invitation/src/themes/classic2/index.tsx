/**
 * classic2 테마(세이지 가든) — 아이보리 여백 · 명조 활자 · 세이지/골드 두 색.
 *
 * 이 파일은 classic2 가 **어떤 섹션을 어떤 컴포넌트로 그리는지** 정의합니다 (순서·포함 여부는
 * `invitation.sections`). 섹션 컴포넌트는 같은 폴더의 sections/ 안에
 * 있고 classic1 과 공유하지 않습니다 — 디자인이 다르다는 것은 곧 마크업이 다르다는 뜻입니다.
 * 반대로 **로직**(게임·방명록·공유·미리보기 배선)은 hooks/ 와 components/common/ 에서
 * 함께 씁니다. 그래야 한쪽만 고쳐지는 사고가 나지 않습니다.
 *
 * 디자인 원본은 저장소 밖 `classic2/index.html` (순수 HTML)입니다. 그 파일의 고정 문구
 * (이름·날짜·주소·예식 순서)는 옮기지 않았습니다 — 값은 청첩장마다 다르므로 전부
 * 발행 스냅샷에서 옵니다. 원본의 'Timeline(예식 순서)' 섹션은 스키마에 대응하는 항목이
 * 없어 빠졌습니다 (넣으려면 `SectionKey` 에 섹션을 추가해야 하고, 에디터·발행 비교까지
 * 함께 손대야 합니다).
 */
import { useEffect, type ComponentType } from 'react';
import { ensureFonts, type SectionKey } from '@luvi/schema';
import { useBgm } from '@/hooks/useBgm';
import { IS_PREVIEW, Slot, notifySectionClick } from '@/components/common/PreviewSlot';
import { MusicToggle } from '@/components/common/MusicToggle';
import { Petals } from '@/components/common/Petals';
import { SectionSkin } from '@/components/common/SectionSkin';
import { useInvitation } from '@/lib/invitationContext';
import { Cover } from './sections/Cover';
import { Greeting } from './sections/Greeting';
import { Calendar } from './sections/Calendar';
import { Gallery } from './sections/Gallery';
import { MiniGame } from './sections/MiniGame';
import { Location } from './sections/Location';
import { Account } from './sections/Account';
import { Guestbook } from './sections/Guestbook';
import { Footer } from './sections/Footer';

/**
 * 섹션 키 → 이 테마의 컴포넌트.
 *
 * **순서는 여기가 정하지 않습니다** — `invitation.sections` 배열의 순서대로 그립니다.
 * 그래야 에디터의 '내 청첩장에 담긴 것' 에서 ▲▼ 로 옮긴 순서와 빼기가 청첩장에 그대로
 * 반영됩니다 (예전에는 이 파일이 순서를 하드코딩해, 순서를 바꿔도 화면이 그대로였습니다).
 *
 * `Record<SectionKey, …>` 로 선언한 이유: 스키마에 섹션이 추가되면 여기에 등록하지 않는 한
 * **컴파일이 실패**합니다. 등록을 잊고 배포하는 사고를 막습니다.
 */
const SECTIONS: Record<SectionKey, ComponentType> = {
  cover: Cover,
  greeting: Greeting,
  calendar: Calendar,
  gallery: Gallery,
  minigame: MiniGame,
  location: Location,
  account: Account,
  guestbook: Guestbook,
  footer: Footer,
};

export default function Classic2Theme() {
  const invitation = useInvitation();
  const { audioRef, musicOn, toggle } = useBgm();

  /**
   * 이 디자인의 장식 영문 글꼴(Pinyon Script)을 여기서 붙입니다.
   * index.html 에 상시 `<link>` 하지 않는 이유: classic1 청첩장을 보는 하객은
   * 쓰지 않는 글꼴을 내려받을 이유가 없습니다 (자세한 근거는 schema 의 fonts.ts).
   */
  useEffect(() => {
    ensureFonts(['pinyon']);
  }, []);

  return (
    <div
      className="relative mx-auto min-h-screen max-w-page overflow-hidden bg-c2-ivory font-sans text-c2-ink shadow-[0_0_70px_rgba(62,58,51,.16)]"
      onClick={IS_PREVIEW ? notifySectionClick : undefined}
    >
      {invitation.bgm && <audio ref={audioRef} loop preload="none" src={invitation.bgm} />}

      <MusicToggle musicOn={musicOn} onToggle={toggle} tone="light" />
      {invitation.showPetals && (
        <Petals items={invitation.petals.items} count={invitation.petals.count} />
      )}

      {invitation.sections.map((key) => {
        const Section = SECTIONS[key];
        // 스키마에 없는 키가 스냅샷에 들어 있어도 화면이 죽지 않게 건너뜁니다
        if (!Section) return null;
        return (
          <Slot key={key} section={key}>
            {/* 에디터에서 고른 배경색을 그 섹션에만 입힙니다 (안 고른 섹션은 그대로) */}
            <SectionSkin section={key}>
              <Section />
            </SectionSkin>
          </Slot>
        );
      })}
    </div>
  );
}
