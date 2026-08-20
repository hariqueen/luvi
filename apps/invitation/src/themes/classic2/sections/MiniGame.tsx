/**
 * 미니게임 (classic2) — 게임 자체는 테마와 무관합니다.
 *
 * 물리·점수·랭킹은 `@/game/catchGame` 과 `useRankings()` 에 있고, 문구는 전부 편집 값
 * (`GameIntro` · `game.texts` · `game.leaderboard`)입니다. 이 파일은 **껍데기**만 이
 * 디자인 톤으로 그립니다 — 게임 로직이나 문구 기본값을 테마마다 복사하면 한쪽만
 * 고쳐지는 사고가 납니다.
 *
 * 설정 저장 위치는 `content.theme.classic1.game` 이고, 어댑터가 테마와 무관하게 읽습니다.
 */
import { useEffect, useRef, useState } from 'react';
import { fillGameText } from '@luvi/schema';
import { CatchGame, type GameResult } from '@/game/catchGame';
import { useRankings } from '@/hooks/useRankings';
import { useInvitation } from '@/lib/invitationContext';
import { GameIntro, GameSpriteView, type BlockClassMap } from '@/components/common/GameParts';

type Phase = 'idle' | 'playing' | 'over';

/** 문단 역할 → 이 디자인에서의 모양 (세이지·명조 톤) */
const INTRO_CLASSES: BlockClassMap = {
  badge: 'font-cormorant text-[12px] uppercase tracking-[0.3em] text-c2-sage-deep',
  title: 'mt-2 font-myeongjo text-[21px] leading-[1.5] text-c2-ink',
  body: 'mx-auto mb-6 mt-4 max-w-[300px] font-myeongjo text-[13px] leading-[1.9] text-c2-ink-soft',
};

export function MiniGame() {
  const { game } = useInvitation();
  const { texts, leaderboard } = game;
  const { rows, hasBoard, register, myRank } = useRankings(leaderboard.size);

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
      fallingItems: game.fallingItems,
      speed: game.speed,
      onGameOver: (r) => {
        setResult(r);
        setPhase('over');
      },
    });
    gameRef.current = engine;
    return () => engine.destroy();
  }, [game.fallingItems, game.speed]);

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

  const vars = { 이름: game.petName, 횟수: result.caught, 점수: result.score };

  return (
    <section className="bg-c2-ivory px-[26px] py-[58px] text-center">
      <GameIntro blocks={game.intro} petName={game.petName} classes={INTRO_CLASSES} />

      <div className="relative overflow-hidden border border-c2-line bg-gradient-to-b from-white via-c2-ivory to-c2-cream shadow-[0_6px_20px_rgba(62,58,51,.06)]">
        <canvas ref={canvasRef} className="block h-[460px] w-full cursor-pointer touch-none" />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-c2-ivory/85 p-6 text-center">
            <GameSpriteView
              sprite={game.idleItem}
              alt={game.petName}
              imgClassName="h-auto w-[96px] animate-bob drop-shadow-[0_10px_18px_rgba(62,58,51,.22)]"
              emojiClassName="block animate-bob text-[76px] leading-none drop-shadow-[0_10px_18px_rgba(62,58,51,.22)]"
            />
            {texts.startTitle.trim() && (
              <div className="mt-4 whitespace-pre-line font-myeongjo text-[19px] text-c2-ink">
                {fillGameText(texts.startTitle, vars)}
              </div>
            )}
            {texts.startDesc.trim() && (
              <div className="mx-0 mb-6 mt-2.5 max-w-[260px] whitespace-pre-line text-[12px] leading-[1.8] text-c2-ink-soft">
                {fillGameText(texts.startDesc, vars)}
              </div>
            )}
            <button
              onClick={startGame}
              className="mt-2 cursor-pointer rounded-full border-none bg-c2-sage-deep px-10 py-3.5 font-myeongjo text-[14px] tracking-[0.04em] text-white"
            >
              {fillGameText(texts.startButton, vars)}
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(62,58,51,.86)] p-6 text-center text-white backdrop-blur-[3px]">
            <div className="font-pinyon text-[38px] leading-none text-white/90">Game Over</div>
            {texts.resultCaught.trim() && (
              <div className="mt-3 whitespace-pre-line text-[12.5px] text-white/85">
                {fillGameText(texts.resultCaught, vars)}
              </div>
            )}
            <div className="mt-2 font-cormorant text-[46px] font-medium leading-none text-c2-gold">
              {result.score}
              <span className="text-lg"> 초</span>
            </div>
            {texts.resultHint.trim() && (
              <div className="mb-6 mt-2 whitespace-pre-line text-[11px] tracking-[0.1em] text-white/70">
                {fillGameText(texts.resultHint, vars)}
              </div>
            )}

            {/* 랭킹을 끈 청첩장에서는 등록 UI 를 띄우지 않습니다 (기록이 갈 곳이 없습니다) */}
            {!leaderboard.show ? (
              <button
                onClick={startGame}
                className="cursor-pointer rounded-full border border-white/50 bg-transparent px-8 py-2.5 text-[13px] text-white"
              >
                다시 도전
              </button>
            ) : registered ? (
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

      {leaderboard.show && (
        <div className="mt-5 border border-c2-line bg-white">
          <div className="flex items-center justify-between border-b border-c2-line px-[18px] py-4">
            <div className="whitespace-pre-line font-myeongjo text-[14px] text-c2-ink">
              {fillGameText(leaderboard.title, vars)}
            </div>
            <div className="flex-none pl-2 text-[10.5px] tracking-[0.14em] text-c2-ink-soft">
              TOP {leaderboard.size}
            </div>
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
            <div className="whitespace-pre-line px-[18px] py-7 font-myeongjo text-[12.5px] leading-[1.8] text-c2-ink-soft">
              {fillGameText(leaderboard.empty, vars)}
            </div>
          )}

          {leaderboard.reward.trim() && (
            <div className="whitespace-pre-line border-t border-c2-line bg-c2-ivory px-[18px] py-3.5 text-[12px] leading-[1.7] text-c2-sage-deep">
              {fillGameText(leaderboard.reward, vars)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
