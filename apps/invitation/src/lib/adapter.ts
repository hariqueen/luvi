/**
 * 발행 스냅샷(PublicInvitation) → 뷰어 설정(InvitationConfig) 변환.
 *
 * 에디터/API 는 정규화된 ContentDoc(에셋은 R2 키, 캘린더·날짜는 weddingAt 에서 파생)을 다루고,
 * 뷰어 섹션들은 완성된 표시값(절대 URL·월 이름·날짜 라벨)을 기대합니다. 그 간극을 여기서 한 번에 메웁니다.
 *
 * 🔴 여기가 "발행하면 그대로 뜬다"의 실제 지점입니다 — 스냅샷의 모든 값이 화면 값으로 1:1 매핑됩니다.
 */
import type { AssetRef, PetalItem, PublicInvitation } from '@luvi/schema';
import {
  DEFAULT_PETAL_COUNT,
  normalizeGame,
  normalizePetalItems,
  normalizeSectionBg,
  resolveSectionText,
} from '@luvi/schema';
import type { GameSprite, InvitationConfig } from '@/config/invitation.config';
import { BASE } from './env';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 사용자가 아직 안 올린 자리를 메우는 기본값.
 *
 * 🔴 **사진을 쓰지 않습니다.** 예전에는 번들된 이미지(`embedded/img_001.png`,
 * `dog{n}_c.png`)를 썼는데 그것이 **첫 고객의 실제 반려견 사진**이었습니다 — 남의
 * 청첩장에 그 사진이 기본값으로 떴습니다. 아이콘은 누구의 것도 아니라 안전하고,
 * 게임 엔진·말풍선 모두 이모지를 그대로 그립니다.
 */
const FALLBACK_SPRITES: GameSprite[] = ['🐶', '🐕', '🦴', '🐾'].map((value) => ({
  kind: 'emoji',
  value,
}));

export function adaptInvitation(pub: PublicInvitation): InvitationConfig {
  const c = pub.content.core;
  const url = (ref: AssetRef | null | undefined): string =>
    ref ? `${pub.cdnBase}/${ref.key}` : '';

  const weddingAt = c.weddingAt;
  const d = new Date(weddingAt);
  const valid = !Number.isNaN(d.getTime());

  const dateLabel = valid
    ? `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} ${WEEKDAYS_EN[d.getDay()]} · ${
        d.getHours() < 12 ? 'AM' : 'PM'
      } ${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`
    : '';

  /**
   * 미니게임 설정. `normalizeGame` 이 빠진 필드를 채우고 옛 필드를 승격합니다 —
   * 이미 발행된 스냅샷은 `mergeContent` 를 거치지 않은 '그때의 JSON' 이라, 뷰어도 같은
   * 정규화를 해야 옛 청첩장의 게임이 그대로 동작합니다.
   */
  const game = normalizeGame(pub.content.theme.classic1?.game);

  /** 아이콘은 그대로, 사진은 절대 URL 로. 키가 비어 URL 이 안 나오는 사진은 버립니다 */
  const sprite = (item: PetalItem): GameSprite | null => {
    if (item.kind === 'emoji') return { kind: 'emoji', value: item.value };
    const src = url(item.asset);
    return src ? { kind: 'image', src } : null;
  };
  const spriteList = (items: PetalItem[]): GameSprite[] =>
    items.map(sprite).filter((s): s is GameSprite => s !== null);

  const fallingItems = spriteList(game.fallingItems);
  const idleItem = spriteList(game.idleItems)[0];
  const shareImage = url(c.share.image) || url(c.cover.image);

  return {
    themeId: pub.themeId,

    // 옛 스냅샷에는 이 키가 없습니다 — 없으면 빈 값(= 로컬 전용)으로 둡니다.
    // 슬러그로 대체 추론하면 안 됩니다: 방명록 경로는 문서 ID 기준이라 엉뚱한 곳에 씁니다.
    invitationId: pub.invitationId ?? '',

    groom: c.couple.groom,
    bride: c.couple.bride,
    weddingAt,

    cover: {
      image: url(c.cover.image),
      layers: c.cover.layers,
    },

    greeting: {
      // 사진이 없으면 빈 문자열 — 섹션이 이모지로 대체합니다 (기본 사진을 두지 않는 이유는 FALLBACK_SPRITES 주석)
      dogImage: url(c.greeting.bubbleImage),
      dogBubble: c.greeting.bubbleText,
      // 이미 발행된 KV 스냅샷은 mergeContent 를 거치지 않은 '그때의 JSON' 이라
      // showBubble 이 생기기 전 스냅샷에는 이 키가 없습니다. 없으면 켜진 것으로 봅니다
      // — undefined 를 그대로 쓰면 재발행 전까지 말풍선이 사라집니다.
      dogBubbleVisible: c.greeting.showBubble !== false,
      message: c.greeting.message,
    },

    calendar: {
      monthLabel: valid ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '',
      highlightDay: valid ? d.getDate() : 0,
    },

    gallery: c.gallery.map((g) => ({ thumb: url(g), full: url(g) })),

    game: {
      gameId: game.gameId,
      petName: game.petName,
      // 고른 것이 없으면 기본 강아지 그림 — 아무것도 떨어지지 않는 게임은 놀 수 없습니다
      fallingItems: fallingItems.length ? fallingItems : FALLBACK_SPRITES,
      idleItem: idleItem ?? FALLBACK_SPRITES[0],
      speed: game.speed,
      intro: game.intro,
      texts: game.texts,
      leaderboard: {
        ...game.leaderboard,
        // 섹션을 빼면 게임 자체가 없으니 랭킹도 없습니다
        show: game.leaderboard.show && pub.sections.includes('minigame'),
      },
    },

    location: {
      venue: c.location.venue,
      hall: c.location.hall,
      tel: c.location.tel,
      address: c.location.address,
      addressForCopy: c.location.addressForCopy,
      mapEmbedSrc: c.location.mapEmbedSrc,
      kakaoMapUrl: c.location.kakaoMapUrl,
      naverMapUrl: c.location.naverMapUrl,
      transport: c.location.transport,
    },

    account: {
      description: c.account.description,
      groups: c.account.groups,
    },

    footer: {
      image: url(c.footer.image) || url(c.cover.image),
    },

    bgm: pub.features.bgm ? url(c.bgm) : '',
    // 담긴 섹션과 순서를 그대로 넘깁니다 — 그리는 순서는 테마가 이 배열을 따릅니다
    sections: pub.sections,

    /**
     * 섹션 배경색. 옛 스냅샷에는 `design` 이 없고, 사용자가 지운 색은 빈 문자열로
     * 남아 있습니다 — `normalizeSectionBg` 가 둘 다 '없음' 으로 정리합니다.
     */
    sectionBg: normalizeSectionBg(c.design?.sectionBg),

    /**
     * 카드마다 적히는 문구. **고른 값 + 디자인 기본값 + 이름 치환을 여기서 끝냅니다** —
     * 섹션 컴포넌트는 결과만 읽습니다. 테마마다 기본 문구를 다시 적으면 한쪽만 바뀝니다.
     */
    sectionText: resolveSectionText(pub.themeId, c.sectionText, {
      신랑: c.couple.groom.firstName,
      신부: c.couple.bride.firstName,
    }),

    showPetals: pub.features.petals,

    /**
     * 낙하 요소. `normalizePetalItems` 가 items(또는 옛 단일 image)를 목록으로 정리합니다.
     * **비어 있으면 아무것도 떨어지지 않습니다** — 몰래 다른 그림을 끼워넣지 않습니다.
     */
    petals: (() => {
      const p = c.effects?.petals;
      const items = normalizePetalItems(p)
        .map((it) =>
          it.kind === 'emoji'
            ? { kind: 'emoji' as const, value: it.value }
            : { kind: 'image' as const, src: url(it.asset) },
        )
        // 키가 비어 URL 이 안 만들어진 사진은 버립니다 (빈 <img> 가 떨어지면 이상합니다)
        .filter((it) => it.kind === 'emoji' || it.src);
      return {
        items,
        count: typeof p?.count === 'number' ? p.count : DEFAULT_PETAL_COUNT,
      };
    })(),

    share: {
      title: c.share.title,
      date: dateLabel,
      url: `${window.location.origin}${BASE}${pub.slug}`,
      description: c.share.description,
      siteName: 'Luvi',
      image: shareImage,
      imageWidth: c.share.image?.w || 1200,
      imageHeight: c.share.image?.h || 630,
      durationMinutes: c.share.durationMinutes,
    },
  };
}

/** 어떤 섹션이 켜져 있는지 — 테마가 섹션 노출을 정할 때 참조 */
export type { PublicInvitation };
