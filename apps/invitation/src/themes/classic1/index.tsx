/**
 * classic1 테마 — 세로 스크롤 한 장짜리 청첩장.
 *
 * 이 파일은 classic1 이 **어떤 섹션을 어떤 컴포넌트로 그리는지**를 정의합니다.
 * 순서와 포함 여부는 청첩장마다 다르므로 `invitation.sections` 가 정합니다 (아래 SECTIONS 주석).
 * 섹션 컴포넌트는 같은 폴더의 sections/ 안에 있고, 다른 테마와 공유하지 않습니다.
 * 여러 테마가 함께 쓰는 것(Petals·MusicToggle·Lightbox 등)만
 * src/components/common/ 에 둡니다.
 */
import type { ComponentType } from 'react';
import type { SectionKey } from '@luvi/schema';
import { useBgm } from '@/hooks/useBgm';
import { IS_PREVIEW, Slot, notifySectionClick } from '@/components/common/PreviewSlot';
import { SectionFreeText } from './ui';
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

export default function Classic1Theme() {
  const invitation = useInvitation();
  const { audioRef, musicOn, toggle } = useBgm();

  return (
    <div
      className="relative mx-auto min-h-screen max-w-page overflow-hidden bg-ivory font-sans text-ink shadow-[0_0_60px_rgba(58,51,46,.18)]"
      onClick={IS_PREVIEW ? notifySectionClick : undefined}
    >
      {invitation.bgm && (
        <audio ref={audioRef} loop preload="none" src={invitation.bgm} />
      )}

      <MusicToggle musicOn={musicOn} onToggle={toggle} />
      {invitation.showPetals && (
        <Petals items={invitation.petals.items} count={invitation.petals.count} />
      )}

      {invitation.sections.map((key) => {
        const Section = SECTIONS[key];
        // 스키마에 없는 키가 스냅샷에 들어 있어도 화면이 죽지 않게 건너뜁니다
        if (!Section) return null;
        return (
          <Slot key={key} section={key}>
            {/* relative — 자유 배치 문구(`SectionFreeText`)가 이 카드 박스를 기준으로 놓입니다 */}
            <div className="relative" data-preview-frame={key}>
              {/* 에디터에서 고른 배경색을 그 섹션에만 입힙니다 (안 고른 섹션은 그대로) */}
              <SectionSkin section={key}>
                <Section />
              </SectionSkin>
              <SectionFreeText section={key} />
            </div>
          </Slot>
        );
      })}
    </div>
  );
}
