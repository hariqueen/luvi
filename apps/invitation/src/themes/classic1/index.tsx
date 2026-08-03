/**
 * classic1 테마 — 세로 스크롤 한 장짜리 청첩장.
 *
 * 이 파일이 classic1 의 "화면 순서"를 정의합니다.
 * 섹션 컴포넌트는 같은 폴더의 sections/ 안에 있고, 다른 테마와 공유하지 않습니다.
 * 여러 테마가 함께 쓰는 것(Petals·MusicToggle·Lightbox 등)만
 * src/components/common/ 에 둡니다.
 */
import { invitation } from '@/config/invitation.config';
import { useBgm } from '@/hooks/useBgm';
import { MusicToggle } from '@/components/common/MusicToggle';
import { Petals } from '@/components/common/Petals';
import { Cover } from './sections/Cover';
import { Greeting } from './sections/Greeting';
import { Calendar } from './sections/Calendar';
import { Gallery } from './sections/Gallery';
import { MiniGame } from './sections/MiniGame';
import { Location } from './sections/Location';
import { Account } from './sections/Account';
import { Guestbook } from './sections/Guestbook';
import { Footer } from './sections/Footer';

export default function Classic1Theme() {
  const { audioRef, musicOn, toggle } = useBgm();

  return (
    <div className="relative mx-auto min-h-screen max-w-page overflow-hidden bg-ivory font-sans text-ink shadow-[0_0_60px_rgba(58,51,46,.18)]">
      {invitation.bgm && (
        <audio ref={audioRef} loop preload="none" src={invitation.bgm} />
      )}

      <MusicToggle musicOn={musicOn} onToggle={toggle} />
      {invitation.showPetals && <Petals image={invitation.greeting.dogImage} />}

      <Cover />
      <Greeting />
      <Calendar />
      <Gallery />
      <MiniGame />
      <Location />
      <Account />
      <Guestbook />
      <Footer />
    </div>
  );
}
