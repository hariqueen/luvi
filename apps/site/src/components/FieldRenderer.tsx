/**
 * 필드 타입 → 입력 컨트롤 매핑.
 *
 * **화면에 필드를 하드코딩하지 않는 것이 이 파일의 존재 이유입니다.**
 * 테마 매니페스트(`FieldDef`)가 폼을 정의하고, 여기서는 타입별 렌더링만 담당합니다.
 * 새 테마를 추가할 때 에디터 화면을 고칠 필요가 없어야 합니다.
 *
 * 현재는 표현(껍데기)만 있고 값 바인딩은 없습니다 — 상태 관리가 붙을 때
 * `value`/`onChange` 를 props 로 받도록 확장하세요.
 */
import type { FieldDef } from '@luvi/schema';

const inputClass =
  'w-full rounded-lg border border-line-strong bg-white px-3.5 py-3 outline-none transition-colors focus:border-gold';

function Label({ field }: { field: FieldDef }) {
  return (
    <div className="mb-1.5">
      <label className="text-[12.5px] font-semibold text-ink">
        {field.label}
        {field.required && <span className="ml-1 text-gold-deep">*</span>}
      </label>
      {field.hint && <p className="mt-1 text-[11.5px] leading-snug text-muted">{field.hint}</p>}
    </div>
  );
}

/** 이미지 업로더. 업로드 → **최적화 중** → 완료 단계가 실재합니다 (브라우저에서 WebP 변환). */
function ImageField({ field, multiple }: { field: FieldDef; multiple?: boolean }) {
  return (
    <div>
      <Label field={field} />
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-surface py-7 text-center"
      >
        <span className="text-[18px]">🖼️</span>
        <span className="text-[12.5px] text-ink-soft">
          {multiple ? '사진 여러 장 고르기' : '사진 고르기'}
        </span>
        <span className="text-[11px] text-muted-faint">
          {field.aspect ? `${field.aspect} 권장` : '탭해서 앨범에서 선택'}
          {field.max ? ` · 최대 ${field.max}장` : ''}
        </span>
      </button>
    </div>
  );
}

/** 반복 항목 (교통편 등). 모바일에서는 카드 하나씩 세로로 쌓습니다. */
function RepeatField({ field }: { field: FieldDef }) {
  return (
    <div>
      <Label field={field} />
      <div className="flex flex-col gap-2">
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="flex flex-col gap-3">
            {field.fields?.map((sub) => (
              <FieldRenderer key={sub.path} field={sub} compact />
            ))}
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-dashed border-line-strong py-2.5 text-[12.5px] text-ink-soft"
        >
          + 추가
        </button>
      </div>
    </div>
  );
}

export function FieldRenderer({ field, compact }: { field: FieldDef; compact?: boolean }) {
  switch (field.type) {
    case 'textarea':
      return (
        <div>
          <Label field={field} />
          <textarea
            rows={field.rows ?? 3}
            maxLength={field.maxLength}
            placeholder={field.label}
            className={`${inputClass} resize-none leading-relaxed`}
          />
          {/*
            모바일에서 시트 안 3줄 textarea 는 쓰기 어렵습니다.
            긴 글은 전체화면 편집 모드로 띄우세요 (docs/05-design-brief.md M3).
          */}
        </div>
      );

    case 'datetime':
      return (
        <div>
          <Label field={field} />
          {/* 모바일에서는 네이티브 피커가 가장 쓰기 좋다 */}
          <input type="datetime-local" className={inputClass} />
        </div>
      );

    case 'number':
      return (
        <div>
          <Label field={field} />
          <input type="number" inputMode="numeric" className={inputClass} />
        </div>
      );

    case 'toggle':
      return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
          <span className="text-[13px] font-medium">{field.label}</span>
          <input type="checkbox" className="h-5 w-9 accent-gold" />
        </label>
      );

    case 'segment':
      return (
        <div>
          <Label field={field} />
          <div className="flex gap-1 rounded-lg bg-surface-sunken p-1">
            {field.options?.map((o) => (
              <button
                key={o.value}
                type="button"
                className="flex-1 rounded-md py-2 text-[12.5px] text-ink-soft"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'icon':
      return (
        <div>
          <Label field={field} />
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {field.options?.map((o) => (
              <button
                key={o.value}
                type="button"
                title={o.label}
                className="flex-none rounded-lg border border-line-strong bg-white px-3 py-2 text-[15px]"
              >
                {o.value}
              </button>
            ))}
          </div>
        </div>
      );

    case 'image':
      return <ImageField field={field} />;
    case 'images':
      return <ImageField field={field} multiple />;

    case 'audio':
      return (
        <div>
          <Label field={field} />
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-3">
            <button type="button" className="text-[15px]" aria-label="미리듣기">
              ▶
            </button>
            <span className="flex-1 truncate text-[12.5px] text-muted">선택된 음원 없음</span>
            <button type="button" className="text-[12px] text-gold-deep">
              고르기
            </button>
          </div>
        </div>
      );

    case 'repeat':
    case 'repeatGroup':
      return <RepeatField field={field} />;

    case 'slug':
      return (
        <div>
          <Label field={field} />
          {/* 접두어를 입력칸 안에 고정 표시해 "주소가 이렇게 된다"를 즉시 보여준다 */}
          <div className="flex items-center overflow-hidden rounded-lg border border-line-strong bg-white focus-within:border-gold">
            <span className="flex-none pl-3.5 text-[12.5px] text-muted-faint">
              luv-ai.co.kr/i/
            </span>
            <input
              placeholder="our-wedding"
              spellCheck={false}
              autoCapitalize="none"
              className="min-w-0 flex-1 bg-transparent py-3 pl-0.5 pr-3.5 outline-none"
            />
          </div>
        </div>
      );

    case 'url':
      return (
        <div>
          <Label field={field} />
          <input type="url" inputMode="url" placeholder="https://" className={inputClass} />
        </div>
      );

    case 'tel':
      return (
        <div>
          <Label field={field} />
          <input type="tel" inputMode="tel" className={inputClass} />
        </div>
      );

    case 'text':
    default:
      return (
        <div>
          {compact ? (
            <label className="mb-1.5 block text-[11.5px] font-medium text-muted">
              {field.label}
            </label>
          ) : (
            <Label field={field} />
          )}
          <input
            type="text"
            maxLength={field.maxLength}
            placeholder={field.label}
            className={inputClass}
          />
        </div>
      );
  }
}
