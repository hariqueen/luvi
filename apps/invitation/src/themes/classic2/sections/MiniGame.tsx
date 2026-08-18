/**
 * 미니게임 (classic2) — 게임 자체는 테마와 무관합니다.
 *
 * 물리·점수·랭킹은 `@/game/catchGame` 과 `useRankings()` 에 있고, 이 파일은 **껍데기**만
 * 이 디자인 톤으로 그립니다 (세이지 버튼·활자 오버레이). 게임 로직을 테마마다 복사하면
 * 한쪽만 고쳐지는 사고가 납니다.
 *
 * 설정(반려동물 이름·낙하 이미지·난이도·랭킹 노출)은 두 디자인이 같은 값을 씁니다 —
 * 저장 위치는 `content.theme.classic1.game` 이고, 어댑터가 테마와 무관하게 읽습니다.
 */
import { useEffect, useRef, useState } from 'react';
import { CatchGame, type GameResult } from '@/game/catchGame';
import { useRankings } from '@/hooks/useRankings';
import { Heading } from '../ui';
import { useInvitation } from '@/lib/invitationContext';

type Phase = 'idle' | 'playing' | 'over';

export function MiniGame() {
  const { game } = useInvitation();
  const { rows, hasBoard, register, myRank } = useRankings();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<CatchGame | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<GameResult>({ score: 0, caught: 0 });
  const [nick, setNick] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CatchGame({
      canvas: canvasRef.current,
      dogImageSrcs: game.fallingImages,
      speed: game.speed,
      onGameOver: (r) => {
        setResult(r);
        setPhase('over');
      },
    });
    gameRef.current = engine;
    return () => engine.destroy();
  }, [game.fallingImages, game.speed]);

  const startGame = () => {
    setRegistered(false);
    setNick('');
    setPhase('playing');
    gameRef.current?.start();
  };

  const onRegister = () => {
    register(nick, result.score, result.caught);
    setRegistered(true);
  };

  return (
    <section className="bg-c2-ivory px-[26px] py-[58px] text-center">
      <Heading script="Mini Game" label={`${game.petName} 받기`} />

      <p className="mx-auto mb-6 mt-6 max-w-[300px] font-myeongjo text-[13px] leading-[1.9] text-c2-ink-soft">
        신랑·신부의 반려동물 <b className="font-normal text-c2-sage-deep">{game.petName}</b>가
        하늘에서 떨어져요.
        <br />
        바구니로 오래 받을수록 고득점, <b className="font-normal text-c2-ink">1등에게는 선물</b>이
        있어요.
      </p>

      <div className="relative overflow-hidden border border-c2-line bg-gradient-to-b from-white via-c2-ivory to-c2-cream shadow-[0_6px_20px_rgba(62,58,51,.06)]">
        <canvas ref={canvasRef} className="block h-[460px] w-full cursor-pointer touch-none" />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-c2-ivory/85 p-6 text-center">
            <img
              src={game.idleImage}
              alt={game.petName}
              className="h-auto w-[96px] animate-bob drop-shadow-[0_10px_18px_rgba(62,58,51,.22)]"
            />
            <div className="mt-4 font-myeongjo text-[19px] text-c2-ink">
              {game.petName}를 받아주세요
            </div>
            <div className="mx-0 mb-6 mt-2.5 max-w-[260px] text-[12px] leading-[1.8] text-c2-ink-soft">
              바구니를 움직여 떨어지는 {game.petName}를 받으세요.
              <br />
              놓치거나 벌을 받으면 체력이 줄어요.
            </div>
            <button
              onClick={startGame}
              className="cursor-pointer rounded-full border-none bg-c2-sage-deep px-10 py-3.5 font-myeongjo text-[14px] tracking-[0.04em] text-white"
            >
              게임 시작
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(62,58,51,.86)] p-6 text-center text-white backdrop-blur-[3px]">
            <div className="font-pinyon text-[38px] leading-none text-white/90">Game Over</div>
            <div className="mt-3 text-[12.5px] text-white/85">
              {game.petName}를 <b className="text-c2-gold">{result.caught}</b>번 받았어요
            </div>
            <div className="mt-2 font-cormorant text-[46px] font-medium leading-none text-c2-gold">
              {result.score}
              <span className="text-lg"> 초</span>
            </div>
            <div className="mb-6 mt-2 text-[11px] tracking-[0.1em] text-white/70">
              생존 시간이 곧 점수예요
            </div>

            {registered ? (
              <div className="flex flex-col items-center gap-3.5">
                <div className="font-myeongjo text-[14.5px]">
                  랭킹 <b className="text-c2-gold">{myRank}위</b>로 등록됐어요
                </div>
                <button
                  onClick={startGame}
                  className="cursor-pointer rounded-full border border-white/50 bg-transparent px-8 py-2.5 text-[13px] text-white"
                >
                  다시 도전
                </button>
              </div>
            ) : (
              <div className="flex w-full max-w-[280px] flex-col items-center gap-2.5">
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  maxLength={12}
                  className="w-full rounded-full border-none bg-white px-4 py-3 text-center text-sm text-c2-ink outline-none"
                />
                <button
                  onClick={onRegister}
                  className="w-full cursor-pointer rounded-full border-none bg-c2-sage py-3.5 font-myeongjo text-[14px] text-white"
                >
                  랭킹에 등록하기
                </button>
                <button
                  onClick={startGame}
                  className="cursor-pointer border-none bg-transparent text-[12.5px] text-white/75 underline"
                >
                  등록 없이 다시하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {game.showLeaderboard && (
        <div className="mt-5 border border-c2-line bg-white">
          <div className="flex items-center justify-between border-b border-c2-line px-[18px] py-4">
            <div className="font-myeongjo text-[14px] text-c2-ink">
              {game.petName} 컬렉터 랭킹
            </div>
            <div className="text-[10.5px] tracking-[0.14em] text-c2-ink-soft">TOP 7</div>
          </div>

          {hasBoard ? (
            <div className="py-1.5">
              {rows.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-[18px] py-2.5"
                  style={{ background: b.isMine ? 'rgba(142,156,132,.14)' : 'transparent' }}
                >
                  <div className="w-[26px] text-center font-cormorant text-[15px] font-medium text-c2-sage-deep">
                    {b.medal}
                  </div>
                  <div className="flex-1 text-left font-myeongjo text-[13.5px] text-c2-ink">
                    {b.nick}
                  </div>
                  <div className="font-mono text-[13px] text-c2-ink">{b.score}초</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-[18px] py-7 font-myeongjo text-[12.5px] leading-[1.8] text-c2-ink-soft">
              아직 기록이 없어요.
              <br />첫 번째 컬렉터가 되어보세요!
            </div>
          )}

          <div className="border-t border-c2-line bg-c2-ivory px-[18px] py-3.5 text-[12px] leading-[1.7] text-c2-sage-deep">
            결혼식 당일까지 <b className="font-normal text-c2-ink">1등</b> 컬렉터님께 신랑·신부가
            준비한 선물을 드려요.
          </div>
        </div>
      )}
    </section>
  );
}
