import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME = 0.55;

/**
 * 배경음악 제어.
 * - 마운트 시 자동재생 시도 (브라우저 정책상 막히면 첫 사용자 상호작용에서 재생)
 * - toggle()로 재생/정지, musicOn으로 UI 표시
 */
export function useBgm() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicOn, setMusicOn] = useState(false);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = VOLUME;
    a.play()
      .then(() => setMusicOn(true))
      .catch(() => setMusicOn(false));
  }, []);

  useEffect(() => {
    play();

    // 자동재생이 차단됐을 때를 대비해 첫 상호작용에서 한 번 더 시도
    const once = () => {
      const a = audioRef.current;
      if (a && a.paused) play();
      remove();
    };
    const remove = () => {
      document.removeEventListener('pointerdown', once);
      document.removeEventListener('touchstart', once);
      document.removeEventListener('keydown', once);
    };
    document.addEventListener('pointerdown', once);
    document.addEventListener('touchstart', once);
    document.addEventListener('keydown', once);
    return remove;
  }, [play]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      play();
    } else {
      a.pause();
      setMusicOn(false);
    }
  }, [play]);

  return { audioRef, musicOn, toggle };
}
