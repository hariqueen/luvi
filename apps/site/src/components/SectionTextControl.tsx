/**
 * 카드 문구 고치기 — 편집 중인 섹션의 윗줄·제목·안내 문구.
 *
 * 지금까지 이 글자들은 **테마 컴포넌트 안의 리터럴**이었습니다. 하객 화면에는 '축하 방명록',
 * '오시는 길', 'Gallery' 가 떠 있는데 에디터에는 그걸 고칠 자리가 없었습니다.
 *
 * 🔴 **비워두면 그 디자인의 기본 문구**입니다. 그래서 입력칸의 placeholder 로 기본 문구를
 *    그대로 보여줍니다 — 빈 칸인데 화면에 글자가 있는 상태를 설명 없이 두면 "저장이 안 됐나"
 *    로 읽힙니다. 기본 문구는 스키마(`SECTION_TEXT_DEFAULTS`) 한 곳에서 오고, 뷰어도 같은
 *    값을 씁니다 — 한쪽만 알면 에디터의 placeholder 와 화면의 글자가 달라집니다.
 *
 * 칸의 구성도 디자인마다 다릅니다 (예: 로즈 클래식의 인사말에는 제목 자리가 없습니다).
 * 없는 자리를 채우게 하면 저장은 되는데 화면에는 안 나오므로, 있는 칸만 그립니다.
 */
import {
  SECTION_TEXT_SLOT_LABEL,
  sectionTextDefault,
  sectionTextSlots,
  type SectionKey,
  type SectionText,
  type SectionTextSlot,
  type ThemeId,
} from '@luvi/schema';

/** 칸마다 다른 길이 제한 — 윗줄은 짧아야 디자인이 유지되고, 안내는 한 문장이 들어갑니다 */
const MAX_LENGTH: Record<SectionTextSlot, number> = {
  eyebrow: 40,
  title: 60,
  note: 140,
};

interface Props {
  themeId: ThemeId;
  sectionKey: SectionKey;
  /** 사용자에게 보이는 섹션 이름 (예: '방명록') */
  label: string;
  /** 지금 저장된 문구. 없는 칸은 기본 문구를 씁니다 */
  value: SectionText;
  onChange: (slot: SectionTextSlot, text: string) => void;
}

export function SectionTextControl({ themeId, sectionKey, label, value, onChange }: Props) {
  const slots = sectionTextSlots(themeId, sectionKey);
  // 커버(사진 위 자유 배치)·미니게임(자기 문단 편집)처럼 여기서 고칠 문구가 없는 카드
  if (slots.length === 0) return null;

  const defaults = slots.map((slot) => sectionTextDefault(themeId, sectionKey, slot));
  const hasNameVar = defaults.some((text) => text.includes('{신랑}') || text.includes('{신부}'));
  const changed = slots.some((slot) => (value[slot] ?? '').trim().length > 0);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] font-semibold">{label} 문구</span>
        <span className="text-[11px] text-muted-soft">비우면 기본 문구</span>
        {changed && (
          <button
            type="button"
            onClick={() => slots.forEach((slot) => onChange(slot, ''))}
            className="ml-auto text-[11.5px] text-gold-deep"
          >
            기본 문구로
          </button>
        )}
      </div>

      {slots.map((slot, i) => (
        <label key={slot} className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">{SECTION_TEXT_SLOT_LABEL[slot]}</span>
          <input
            value={value[slot] ?? ''}
            onChange={(e) => onChange(slot, e.target.value)}
            // placeholder = 지금 화면에 보이는 글자. 빈 칸의 의미를 이것으로 설명합니다
            placeholder={defaults[i]}
            maxLength={MAX_LENGTH[slot]}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-gold"
          />
        </label>
      ))}

      {hasNameVar && (
        <p className="text-[11.5px] leading-relaxed text-muted">
          <b className="font-semibold">{'{신랑}'}</b> · <b className="font-semibold">{'{신부}'}</b>{' '}
          라고 쓰면 기본 정보에 적은 이름이 들어갑니다.
        </p>
      )}
    </div>
  );
}
