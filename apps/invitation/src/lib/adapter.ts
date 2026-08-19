/**
 * 발행 스냅샷(PublicInvitation) → 뷰어 설정(InvitationConfig) 변환.
 *
 * 에디터/API 는 정규화된 ContentDoc(에셋은 R2 키, 캘린더·날짜는 weddingAt 에서 파생)을 다루고,
 * 뷰어 섹션들은 완성된 표시값(절대 URL·월 이름·날짜 라벨)을 기대합니다. 그 간극을 여기서 한 번에 메웁니다.
 *
 * 🔴 여기가 "발행하면 그대로 뜬다"의 실제 지점입니다 — 스냅샷의 모든 값이 화면 값으로 1:1 매핑됩니다.
 */
import type { AssetRef, PublicInvitation } from '@luvi/schema';
import { DEFAULT_PETAL_COUNT, normalizePetalItems } from '@luvi/schema';
import type { InvitationConfig } from '@/config/invitation.config';
import { BASE } from './env';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const pad = (n: number) => String(n).padStart(2, '0');

/** 번들된 기본 에셋 (사용자가 아직 안 올린 자리 메우기용) */
const asset = (name: string) => `${BASE}assets/${name}`;
const FALLBACK = {
  dog: asset('embedded/img_001.png'),
  gameFalling: [1, 2, 3, 4, 5, 6].map((n) => asset(`dog${n}_c.png`)),
  gameIdle: asset('embedded/img_010.png'),
};

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

  const game = pub.content.theme.classic1?.game ?? {
    petName: '',
    fallingImages: [] as AssetRef[],
    idleImage: null,
    speed: 'normal' as const,
    showLeaderboard: false,
  };
  const fallingImages = game.fallingImages.map(url).filter(Boolean);
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
      dogImage: url(c.greeting.bubbleImage) || FALLBACK.dog,
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
      petName: game.petName,
      fallingImages: fallingImages.length ? fallingImages : FALLBACK.gameFalling,
      idleImage: url(game.idleImage) || FALLBACK.gameIdle,
      speed: game.speed,
      showLeaderboard: game.showLeaderboard && pub.sections.includes('minigame'),
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
    showPetals: pub.features.petals,

    /**
     * 낙하 요소. 어느 시대의 스냅샷이든 `normalizePetalItems` 가 목록으로 정리해줍니다
     * (items → 옛 단일 image → 인사말 말풍선 아이콘). 그래도 비면 번들 기본 이미지.
     */
    petals: (() => {
      const p = c.effects?.petals;
      const items = normalizePetalItems(p, c.greeting.bubbleImage).map((it) =>
        it.kind === 'emoji'
          ? { kind: 'emoji' as const, value: it.value }
          : { kind: 'image' as const, src: url(it.asset) },
      );
      const usable = items.filter((it) => it.kind === 'emoji' || it.src);
      return {
        items: usable.length > 0 ? usable : [{ kind: 'image' as const, src: FALLBACK.dog }],
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
