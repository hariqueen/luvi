/**
 * 미니게임의 **테마 공통 부품** — 소개 문단과 그림 하나.
 *
 * 게임 로직처럼, 사용자가 편집한 값을 어떻게 읽는지도 한 곳에 둡니다. 테마마다 복사하면
 * 한쪽만 고쳐지는 사고가 납니다 (문단 순서를 classic1 에서만 반영하는 식으로).
 * 테마가 정하는 것은 **모양(클래스)** 뿐이고, 무엇을 그리는지는 여기서 정합니다.
 */
import type { TextBlock, TextBlockStyle } from '@luvi/schema';
import { fillGameText } from '@luvi/schema';
import type { GameSprite } from '@/config/invitation.config';

/** 역할(배지·제목·설명) → 이 테마에서 쓸 클래스 */
export type BlockClassMap = Record<TextBlockStyle, string>;

/**
 * 편집한 소개 문단을 순서대로 그립니다.
 *
 * 🔴 `whitespace-pre-line` — 편집칸에서 누른 줄바꿈이 화면에 그대로 보여야 합니다.
 *    이게 없으면 사용자는 "줄을 나눴는데 붙어서 나온다" 를 겪습니다.
 */
export function GameIntro({
  blocks,
  petName,
  classes,
}: {
  blocks: TextBlock[];
  petName: string;
  classes: BlockClassMap;
}) {
  return (
    <>
      {blocks
        // 빈 문단은 자리만 차지하므로 그리지 않습니다 (지우는 중일 수도 있습니다)
        .filter((b) => b.text.trim().length > 0)
        .map((block) => (
          <p key={block.id} className={`whitespace-pre-line ${classes[block.style]}`}>
            {fillGameText(block.text, { 이름: petName })}
          </p>
        ))}
    </>
  );
}

/** 아이콘이면 글자로, 사진이면 `<img>` 로 그립니다 */
export function GameSpriteView({
  sprite,
  alt,
  imgClassName,
  emojiClassName,
}: {
  sprite: GameSprite;
  alt: string;
  imgClassName: string;
  /** 이모지는 폭이 아니라 글자 크기로 조절합니다 */
  emojiClassName: string;
}) {
  if (sprite.kind === 'emoji') {
    return (
      <span role="img" aria-label={alt} className={emojiClassName}>
        {sprite.value}
      </span>
    );
  }
  return <img src={sprite.src} alt={alt} className={imgClassName} />;
}
