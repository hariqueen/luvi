/**
 * 달력·남은 날짜 세기의 **글자** — 테마 공통 부품.
 *
 * 날짜·요일·남은 시간의 **숫자**는 예식 일시(`core.weddingAt`)에서 계산되므로 고칠 수
 * 없습니다. 고칠 수 있는 것은 그 옆에 붙는 글자(요일 머리글·단위)뿐이고, 그 글자들은
 * 미리보기에서 눌러서 바로 고칩니다.
 *
 * 🔴 테마마다 이 배선을 복사하지 않습니다 — 한쪽만 고쳐지면 그 디자인에서만 요일이
 *    안 고쳐지는데, 화면상으론 멀쩡해 보여서 원인을 찾기 어렵습니다 (`GameParts` 와 같은 이유).
 */
import { richToPlain } from '@luvi/schema';
import { EditableText } from './Editable';
import { IS_PREVIEW, notifyFieldEdit } from './PreviewSlot';

const WEEKDAYS_PATH = 'core.labels.calendarWeekdays';

/**
 * 요일 머리글 한 칸.
 *
 * 🔴 저장되는 값은 **일곱 칸을 쉼표로 이어붙인 문자열 하나**입니다 (`labels.ts`). 그래서 한
 *    칸을 고쳐도 일곱 칸을 다시 이어서 보냅니다. 친 쉼표는 빈칸으로 바꿉니다 — 그대로 두면
 *    칸이 여덟 개가 되고, 개수가 어긋나면 요일과 날짜가 통째로 어긋난 채 그려집니다.
 *
 * 굵게·기울임도 받지 않습니다(`richToPlain`). 값이 쉼표로 쪼개지는 문자열이라 태그가
 * 섞이면 다음 번에 요일로 읽히지 않습니다.
 */
export function WeekdayCell({ weekdays, index }: { weekdays: string[]; index: number }) {
  const value = weekdays[index] ?? '';
  if (!IS_PREVIEW) return <>{value}</>;

  return (
    <EditableText
      text={value}
      placeholder="요일"
      onEdit={(next) => {
        const cell = richToPlain(next).replace(/,/g, ' ').trim();
        notifyFieldEdit(
          WEEKDAYS_PATH,
          weekdays.map((w, i) => (i === index ? cell : w)).join(','),
        );
      }}
    />
  );
}
