/**
 * 미니게임 (classic1).
 *
 * 화면의 **모든 문구는 편집 값**입니다 — 소개 문단(순서·추가·삭제), 시작 화면 문구,
 * 결과 문구, 랭킹 문구. 이 파일에 문장을 새로 적으면 편집 화면에서 바꿀 수 없는 글이
 * 생기므로, 기본 문구는 스키마(`DEFAULT_GAME_TEXTS`)에만 둡니다.
 *
 * `{이름}`·`{횟수}`·`{점수}` 는 `fillGameText` 가 실제 값으로 바꿉니다.
 */
import { useEffect, useRef, useState } from 'react';
import { fillGameText } from '@luvi/schema';
import { CatchGame, type GameResult } from '@/game/catchGame';
import { useRankings } from '@/hooks/useRankings';
import { useInvitation } from '@/lib/invitationContext';
import { GameIntro, GameSpriteView, type BlockClassMap } from '@/components/common/GameParts';

type Phase = 'idle' | 'playing' | 'over';

/** 로즈색 3D 눌림 버튼 스타일 */
const pushBtn =
  'cursor-pointer rounded-full border-none bg-rose font-extrabold text-white ' +
  'shadow-[0_8px_0_#A65A6E,0_14px_22px_rgba(199,123,139,.45)] ' +
  'transition-[transform,box-shadow] duration-100 ' +
  'active:translate-y-1 active:shadow-[0_4px_0_#A65A6E,0_8px_14px_rgba(199,123,139,.4)]';

/** 문단 역할 → 이 디자인에서의 모양. 예전에 하드코딩돼 있던 배지·제목·설명 그대로입니다 */
const INTRO_CLASSES: BlockClassMap = {
  badge:
    'mx-auto inline-flex items-center gap-1.5 rounded-full bg-rose px-3.5 py-1.5 text-[11px] ' +
    'font-bold tracking-[0.1em] text-white shadow-[0_6px_16px_rgba(199,123,139,.4)]',
  title: 'mt-4 mb-1.5 font-myeongjo text-2xl text-ink',
  body: 'mx-auto mb-[22px] max-w-[300px] text-[13.5px] leading-[1.7] text-ink-soft',
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

  /** 문구 치환용 값 — 결과 화면에서 받은 횟수·점수를 쓸 수 있습니다 */
  const vars = { 이름: game.petName, 횟수: result.caught, 점수: result.score };

  return (
    <section className="bg-gradient-to-b from-cream to-ivory px-[22px] py-[56px] text-center">
      <GameIntro blocks={game.intro} petName={game.petName} classes={INTRO_CLASSES} />

      {/* 게임 캔버스 + 오버레이 */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#dbeafe] via-[#eef4ec] to-[#f6efe6] shadow-lg">
        <canvas ref={canvasRef} className="block h-[460px] w-full cursor-pointer touch-none" />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#dbeafe8c] to-[#f6efe6d9] p-6 text-center">
            <div className="relative animate-bob">
              <GameSpriteView
                sprite={game.idleItem}
                alt={game.petName}
                imgClassName="h-auto w-[104px] drop-shadow-[0_10px_18px_rgba(58,51,46,.28)]"
                emojiClassName="block text-[84px] leading-none drop-shadow-[0_10px_18px_rgba(58,51,46,.28)]"
              />
              <span className="absolute -right-3 -top-1 animate-wobble-fast text-2xl">🎀</span>
            </div>
            <div className="mt-3.5 flex gap-1 text-base">❤️❤️❤️</div>
            {texts.startTitle.trim() && (
              <div className="mt-2 whitespace-pre-line font-myeongjo text-[21px] font-bold text-ink">
                {fillGameText(texts.startTitle, vars)}
              </div>
            )}
            {texts.startDesc.trim() && (
              <div className="mx-0 mb-5 mt-2 max-w-[255px] whitespace-pre-line text-[12.5px] leading-[1.7] text-ink-soft">
                {fillGameText(texts.startDesc, vars)}
              </div>
            )}
            <button onClick={startGame} className={`${pushBtn} mt-3 px-11 py-[15px] text-base`}>
              {fillGameText(texts.startButton, vars)}
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(58,51,46,.82)] p-6 text-center text-white backdrop-blur-[3px]">
            <div className="font-cormorant text-3xl tracking-[0.04em] opacity-90">Game Over</div>
            {texts.resultCaught.trim() && (
              <div className="mt-1.5 whitespace-pre-line text-[13px] opacity-85">
                {fillGameText(texts.resultCaught, vars)}
              </div>
            )}
            <div className="mb-0.5 mt-2 font-mono text-[46px] font-extrabold text-[#ffd9a8]">
              {result.score}
              <span className="text-lg"> 초</span>
            </div>
            {texts.resultHint.trim() && (
              <div className="mb-[18px] whitespace-pre-line text-xs opacity-80">
                {fillGameText(texts.resultHint, vars)}
              </div>
            )}

            {/*
              랭킹을 끈 청첩장에서는 등록 UI 자체가 없어야 합니다 — 닉네임을 받아 두고
              어디에도 보여주지 않으면, 하객은 자기 기록이 사라졌다고 읽습니다.
            */}
            {!leaderboard.show ? (
              <button onClick={startGame} className={`${pushBtn} mt-2 px-9 py-3 text-[15px]`}>
                다시 도전
              </button>
            ) : registered ? (
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
      {leaderboard.show && (
        <div className="mt-[22px] overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-[18px] py-4">
            <div className="whitespace-pre-line font-myeongjo text-[15px] font-bold text-ink">
              {fillGameText(leaderboard.title, vars)}
            </div>
            <div className="flex-none pl-2 text-[11px] text-ink-soft">TOP {leaderboard.size}</div>
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
            <div className="whitespace-pre-line px-[18px] py-[26px] text-[13px] text-ink-soft">
              {fillGameText(leaderboard.empty, vars)}
            </div>
          )}

          {leaderboard.reward.trim() && (
            <div className="whitespace-pre-line border-t border-line bg-gradient-to-br from-white to-[#fdeef0] px-[18px] py-3.5 text-[12.5px] leading-[1.6] text-rose-deep">
              {fillGameText(leaderboard.reward, vars)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
