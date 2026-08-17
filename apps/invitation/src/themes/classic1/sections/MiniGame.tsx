import { useEffect, useRef, useState } from 'react';
import { CatchGame, type GameResult } from '@/game/catchGame';
import { useRankings } from '@/hooks/useRankings';
import { useInvitation } from '@/lib/invitationContext';

type Phase = 'idle' | 'playing' | 'over';

/** 로즈색 3D 눌림 버튼 스타일 */
const pushBtn =
  'cursor-pointer rounded-full border-none bg-rose font-extrabold text-white ' +
  'shadow-[0_8px_0_#A65A6E,0_14px_22px_rgba(199,123,139,.45)] ' +
  'transition-[transform,box-shadow] duration-100 ' +
  'active:translate-y-1 active:shadow-[0_4px_0_#A65A6E,0_8px_14px_rgba(199,123,139,.4)]';

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
    <section className="bg-gradient-to-b from-cream to-ivory px-[22px] py-[56px] text-center">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-rose px-3.5 py-1.5 text-[11px] font-bold tracking-[0.1em] text-white shadow-[0_6px_16px_rgba(199,123,139,.4)]">
        🎮 MINI GAME
      </div>
      <h2 className="my-4 mb-1.5 font-myeongjo text-2xl text-ink">떨어지는 {game.petName} 받기</h2>
      <p className="mx-auto mb-[22px] max-w-[300px] text-[13.5px] leading-[1.7] text-ink-soft">
        신랑·신부의 반려견 <b className="text-rose-deep">{game.petName}</b>가 하늘에서 떨어져요!
        <br />
        바구니로 오래 받을수록 고득점, <b>1등은 선물</b>이 있어요 🎁
      </p>

      {/* 게임 캔버스 + 오버레이 */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#dbeafe] via-[#eef4ec] to-[#f6efe6] shadow-lg">
        <canvas
          ref={canvasRef}
          className="block h-[460px] w-full cursor-pointer touch-none"
        />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#dbeafe8c] to-[#f6efe6d9] p-6 text-center">
            <div className="relative animate-bob">
              <img
                src={game.idleImage}
                alt={game.petName}
                className="h-auto w-[104px] drop-shadow-[0_10px_18px_rgba(58,51,46,.28)]"
              />
              <span className="absolute -right-3 -top-1 animate-wobble-fast text-2xl">🎀</span>
            </div>
            <div className="mt-3.5 flex gap-1 text-base">❤️❤️❤️</div>
            <div className="mt-2 font-myeongjo text-[21px] font-bold text-ink">
              {game.petName}를 받아주세요!
            </div>
            <div className="mx-0 mb-5 mt-2 max-w-[255px] text-[12.5px] leading-[1.7] text-ink-soft">
              바구니 🧺 를 움직여 떨어지는 {game.petName}를 받으세요.
              <br />
              놓치거나 벌 🐝 을 받으면 체력이 줄어요!
            </div>
            <button onClick={startGame} className={`${pushBtn} px-11 py-[15px] text-base`}>
              🎮 게임 시작
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(58,51,46,.82)] p-6 text-center text-white backdrop-blur-[3px]">
            <div className="font-cormorant text-3xl tracking-[0.04em] opacity-90">Game Over</div>
            <div className="mt-1.5 text-[13px] opacity-85">
              {game.petName}를 <b className="text-[#ffd9a8]">{result.caught}</b>번 받았어요
            </div>
            <div className="mb-0.5 mt-2 font-mono text-[46px] font-extrabold text-[#ffd9a8]">
              {result.score}
              <span className="text-lg"> 초</span>
            </div>
            <div className="mb-[18px] text-xs opacity-80">생존 시간이 곧 점수예요</div>

            {registered ? (
              <div className="flex flex-col items-center gap-3.5">
                <div className="text-[15px] font-bold">
                  🎉 랭킹 <b className="text-[#ffd9a8]">{myRank}위</b>로 등록됐어요!
                </div>
                <button
                  onClick={startGame}
                  className="cursor-pointer rounded-full border border-white/50 bg-transparent px-[30px] py-[11px] text-sm font-semibold text-white"
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
                  className="w-full rounded-full border-none bg-white px-4 py-3 text-center text-sm text-ink outline-none"
                />
                <button
                  onClick={onRegister}
                  className="w-full cursor-pointer rounded-full border-none bg-rose py-3.5 text-[15px] font-extrabold text-white shadow-[0_6px_0_#A65A6E] transition-[transform,box-shadow] duration-100 active:translate-y-[3px] active:shadow-[0_3px_0_#A65A6E]"
                >
                  🏆 랭킹에 등록하기
                </button>
                <button
                  onClick={startGame}
                  className="cursor-pointer border-none bg-transparent text-[13px] text-white/75 underline"
                >
                  등록 없이 다시하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 랭킹판 */}
      {game.showLeaderboard && (
        <div className="mt-[22px] overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-[18px] py-4">
            <div className="font-myeongjo text-[15px] font-bold text-ink">
              🏆 {game.petName} 컬렉터 랭킹
            </div>
            <div className="text-[11px] text-ink-soft">TOP 7</div>
          </div>

          {hasBoard ? (
            <div className="py-1.5">
              {rows.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-[18px] py-[11px]"
                  style={{ background: b.isMine ? 'rgba(199,123,139,.14)' : 'transparent' }}
                >
                  <div className="w-[26px] text-center text-sm font-extrabold text-rose-deep">
                    {b.medal}
                  </div>
                  <div className="flex-1 text-left text-sm font-semibold text-ink">{b.nick}</div>
                  <div className="font-mono text-sm font-bold text-ink">{b.score}초</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-[18px] py-[26px] text-[13px] text-ink-soft">
              아직 기록이 없어요.
              <br />첫 번째 {game.petName} 컬렉터가 되어보세요! 🐶
            </div>
          )}

          <div className="border-t border-line bg-gradient-to-br from-white to-[#fdeef0] px-[18px] py-3.5 text-[12.5px] leading-[1.6] text-rose-deep">
            🎁 결혼식 당일까지 <b>1등</b> 컬렉터님께 신랑·신부가 준비한 선물을 드려요!
          </div>
        </div>
      )}
    </section>
  );
}
