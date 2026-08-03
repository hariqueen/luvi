import { invitation } from '@/config/invitation.config';
import { useBgm } from '@/hooks/useBgm';
import { MusicToggle } from '@/components/common/MusicToggle';
import { Petals } from '@/components/common/Petals';
import { Cover } from '@/components/sections/Cover';
import { Greeting } from '@/components/sections/Greeting';
import { Calendar } from '@/components/sections/Calendar';
import { Gallery } from '@/components/sections/Gallery';
import { MiniGame } from '@/components/sections/MiniGame';
import { Location } from '@/components/sections/Location';
import { Account } from '@/components/sections/Account';
import { Guestbook } from '@/components/sections/Guestbook';
import { Footer } from '@/components/sections/Footer';

export default function App() {
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
