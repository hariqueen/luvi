/**
 * 섹션 배경색 고르기 — 편집 중인 섹션 하나의 배경색.
 *
 * 폼 **맨 위**에 둡니다. 배경색은 그 섹션 전체에 걸리는 값이라, 필드들 사이에 끼우면
 * "어느 항목의 색인지" 가 흐려집니다.
 *
 * 사진이 화면을 꽉 채우는 섹션(예: 로즈 클래식의 커버·마무리)에는 컨트롤 대신 이유를
 * 한 줄 적습니다 — 눌러도 화면이 그대로인 컨트롤은 "저장이 안 됐나?" 로 읽힙니다.
 * 판정은 스키마의 `canPaintSection` 한 곳에서 옵니다 (뷰어와 같은 규칙).
 */
import { SECTION_BG_COLORS, canPaintSection, type SectionKey, type ThemeId } from '@luvi/schema';
import { ColorControl } from './ColorControl';

interface Props {
  themeId: ThemeId;
  sectionKey: SectionKey;
  /** 사용자에게 보이는 섹션 이름 (예: '인사말') */
  label: string;
  /** 지금 색. 빈 문자열이면 디자인 기본 */
  value: string;
  onChange: (color: string) => void;
}

export function SectionBgControl({ themeId, sectionKey, label, value, onChange }: Props) {
  const paintable = canPaintSection(themeId, sectionKey);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] font-semibold">{label} 배경색</span>
        <span className="text-[11px] text-muted-soft">이 섹션만 바뀝니다</span>
      </div>

      {paintable ? (
        <>
          <ColorControl
            value={value}
            presets={SECTION_BG_COLORS}
            // 폼 안이라 좁은 화면(바텀시트)에서는 접혀야 HEX 칸까지 다 보입니다
            wrap
            onChange={onChange}
            // 빈 문자열 = '고르지 않음'. 뷰어가 그때 디자인 기본 배경을 씁니다
            onClear={() => onChange('')}
            clearLabel="디자인 기본"
          />
          <p className="text-[11.5px] leading-relaxed text-muted">
            글자색은 디자인이 정한 색 그대로예요. 어두운 색을 고르면 글이 잘 안 보일 수
            있어요 — 오른쪽 미리보기로 확인해 주세요.
          </p>
        </>
      ) : (
        <p className="text-[11.5px] leading-relaxed text-muted">
          이 디자인의 “{label}” 은 사진이 화면을 꽉 채워서 배경색이 보이지 않아요. 사진을
          바꾸면 분위기가 달라집니다.
        </p>
      )}
    </div>
  );
}
