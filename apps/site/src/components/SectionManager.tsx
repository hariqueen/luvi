/**
 * 섹션 관리 — 담긴 것 / 추가할 수 있는 것.
 *
 * 순서 변경을 **드래그가 아니라 ↑↓ 버튼**으로 합니다. 캔버스의 텍스트 드래그와 달리
 * 리스트 정렬은 스크롤과 충돌해서, 터치에서 드래그로 하면 오작동이 잦습니다.
 * 버튼은 느리지만 실패하지 않습니다. (드래그는 데스크톱에서 v2 로 얹으면 됩니다)
 *
 * 필수 섹션은 제거 버튼을 아예 안 보여줍니다 — 누르고 나서 거절당하는 것보다 낫습니다.
 */
import { SECTION_KEYS, canRemoveSection, type SectionBgMap, type SectionKey } from '@luvi/schema';

export interface SectionMeta {
  key: SectionKey;
  label: string;
  /** 목록에 곁들일 한 줄 상태 (예: '사진 7장') */
  status?: string;
  /** 추가 목록에서 보여줄 설명 */
  desc?: string;
}

interface Props {
  /** 담긴 섹션 — 배열 순서가 화면 순서 */
  active: SectionKey[];
  meta: Record<SectionKey, SectionMeta>;
  /**
   * 섹션마다 고른 배경색 — 카드에 색 점으로 보여줍니다.
   * 어디에 색을 넣었는지 목록에서 바로 보여야 폼을 하나씩 열어보지 않습니다.
   */
  bg?: SectionBgMap;
  onReorder: (next: SectionKey[]) => void;
  onRemove: (key: SectionKey) => void;
  onAdd: (key: SectionKey) => void;
  onEdit: (key: SectionKey) => void;
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item === undefined) return list;
  next.splice(to, 0, item);
  return next;
}

export function SectionManager({ active, meta, bg, onReorder, onRemove, onAdd, onEdit }: Props) {
  // 목록은 스키마(SECTION_KEYS)에서 옵니다 — 여기 따로 적어 두면 섹션을 추가했을 때
  // '추가할 수 있는 것' 에만 안 나타납니다
  const available = SECTION_KEYS.filter((k) => !active.includes(k));

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="mb-2 text-[11px] tracking-wide text-muted-soft">내 청첩장에 담긴 것</h3>
        <div className="flex flex-col gap-1.5">
          {active.map((key, i) => {
            const m = meta[key];
            const removable = canRemoveSection(key);

            return (
              <div
                key={key}
                className="flex items-center gap-2 rounded-xl border border-line bg-white px-2.5 py-2.5"
              >
                {/* 순서 변경 */}
                <div className="flex flex-none flex-col">
                  <button
                    type="button"
                    aria-label={`${m.label} 위로`}
                    disabled={i === 0}
                    onClick={() => onReorder(move(active, i, i - 1))}
                    className="px-1.5 text-[10px] leading-tight text-muted disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`${m.label} 아래로`}
                    disabled={i === active.length - 1}
                    onClick={() => onReorder(move(active, i, i + 1))}
                    className="px-1.5 text-[10px] leading-tight text-muted disabled:opacity-25"
                  >
                    ▼
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {/* 색을 고른 섹션만 점이 찍힙니다 (기본 배경은 점 없음) */}
                    {bg?.[key] && (
                      <span
                        aria-label={`배경색 ${bg[key]}`}
                        title={`배경색 ${bg[key]}`}
                        className="h-3 w-3 flex-none rounded-full border border-line-strong"
                        style={{ background: bg[key] }}
                      />
                    )}
                    <span className="truncate text-[13px] font-semibold">{m.label}</span>
                  </div>
                  {m.status && (
                    <div className="truncate text-[11px] text-muted-soft">{m.status}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onEdit(key)}
                  className="flex-none rounded-lg border border-line-strong bg-white px-3 py-1.5 text-[11.5px]"
                >
                  편집
                </button>
                {removable && (
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    className="flex-none rounded-lg px-2 py-1.5 text-[11.5px] text-muted"
                  >
                    빼기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/*
        더 넣을 것이 없으면 이 묶음을 **아예 그리지 않습니다** — 빈 자리에 "없습니다" 를
        적어두면 목록 끝이 비어 보이기만 하고, 그 자리는 아래의 '텍스트 상자 추가' 가 씁니다.
      */}
      {available.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] tracking-wide text-muted-soft">추가할 수 있는 것</h3>
          <div className="flex flex-col gap-1.5">
            {available.map((key) => {
              const m = meta[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onAdd(key)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-line-strong bg-surface px-3 py-3 text-left"
                >
                  <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-lg bg-line-soft text-[13px] text-gold-deep">
                    +
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{m.label}</div>
                    {m.desc && (
                      <div className="text-[11px] leading-snug text-muted">{m.desc}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
