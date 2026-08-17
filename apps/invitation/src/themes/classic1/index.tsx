/**
 * classic1 테마 — 세로 스크롤 한 장짜리 청첩장.
 *
 * 이 파일이 classic1 의 "화면 순서"를 정의합니다.
 * 섹션 컴포넌트는 같은 폴더의 sections/ 안에 있고, 다른 테마와 공유하지 않습니다.
 * 여러 테마가 함께 쓰는 것(Petals·MusicToggle·Lightbox 등)만
 * src/components/common/ 에 둡니다.
 */
import type { MouseEvent, ReactNode } from 'react';
import type { SectionKey } from '@luvi/schema';
import { useBgm } from '@/hooks/useBgm';
import { MusicToggle } from '@/components/common/MusicToggle';
import { Petals } from '@/components/common/Petals';
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
 * 에디터 미리보기(iframe, ?preview=1)일 때만 각 섹션을 클릭 대상으로 감쌉니다.
 * 클릭하면 부모(에디터)에게 어떤 섹션인지 알려 해당 편집을 열게 합니다.
 * 하객 화면에는 이 래퍼가 붙지 않으므로 레이아웃/동작에 영향이 없습니다.
 */
const IS_PREVIEW =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('preview');

function Slot({ section, children }: { section: SectionKey; children: ReactNode }) {
  if (!IS_PREVIEW) return <>{children}</>;
  return (
    <div
      data-preview-section={section}
      className="relative cursor-pointer outline-offset-[-2px] transition-[outline-color] hover:outline hover:outline-2 hover:outline-gold"
    >
      {children}
    </div>
  );
}

function notifySectionClick(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('[data-preview-section]');
  const key = el?.getAttribute('data-preview-section');
  if (key) window.parent?.postMessage({ __luviSectionClick: key }, window.location.origin);
}

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
        <Petals
          image={invitation.petals.image}
          count={invitation.petals.count}
          custom={invitation.petals.custom}
        />
      )}

      <Slot section="cover"><Cover /></Slot>
      <Slot section="greeting"><Greeting /></Slot>
      <Slot section="calendar"><Calendar /></Slot>
      <Slot section="gallery"><Gallery /></Slot>
      <Slot section="minigame"><MiniGame /></Slot>
      <Slot section="location"><Location /></Slot>
      <Slot section="account"><Account /></Slot>
      <Slot section="guestbook"><Guestbook /></Slot>
      <Slot section="footer"><Footer /></Slot>
    </div>
  );
}
