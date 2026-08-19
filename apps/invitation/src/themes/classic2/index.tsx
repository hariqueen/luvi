/**
 * classic2 테마(세이지 가든) — 아이보리 여백 · 명조 활자 · 세이지/골드 두 색.
 *
 * 이 파일이 classic2 의 "화면 순서"를 정의합니다. 섹션 컴포넌트는 같은 폴더의 sections/ 안에
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
import { useEffect } from 'react';
import { ensureFonts } from '@luvi/schema';
import { useBgm } from '@/hooks/useBgm';
import { IS_PREVIEW, Slot, notifySectionClick } from '@/components/common/PreviewSlot';
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
