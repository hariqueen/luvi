/**
 * 전체화면 문구 편집.
 *
 * 왜 별도 화면인가: 모바일에서 바텀시트 안 3줄 textarea 는 키보드가 올라오면 거의 안 보입니다.
 * 긴 글은 화면을 다 쓰는 편이 낫습니다 (디자인 브리프 M3).
 */
import { useEffect, useRef, useState } from 'react';
import { FONT_STACK, type TextLayer } from '@luvi/schema';

interface Props {
  layer: TextLayer;
  onDone: (text: string) => void;
  onCancel: () => void;
}

export function TextEditorOverlay({ layer, onDone, onCancel }: Props) {
  const [value, setValue] = useState(layer.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  /** 열리면 바로 입력할 수 있게. 커서는 끝으로 보낸다 */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ink-deep/[.88] backdrop-blur-sm">
      <div className="flex flex-none items-center justify-between px-3 py-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1.5 text-[13px] text-muted-faint"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onDone(value)}
          className="px-2 py-1.5 text-[14px] font-bold text-paper"
        >
          완료
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="문구를 입력하세요"
          rows={3}
          // 실제 커버에 보일 글꼴·정렬로 미리 보여준다
          className="w-full resize-none bg-transparent text-center outline-none placeholder:text-paper/40"
          style={{
            fontFamily: FONT_STACK[layer.font],
            color: layer.color,
            fontWeight: layer.weight,
            lineHeight: layer.lineHeight,
            letterSpacing: `${layer.letterSpacing}em`,
            fontSize: 'clamp(20px, 6vw, 34px)',
            textAlign: layer.align,
          }}
        />
      </div>

      <p className="flex-none pb-6 text-center text-[11px] text-paper/40">
        줄바꿈은 그대로 보입니다
      </p>
    </div>
  );
}
