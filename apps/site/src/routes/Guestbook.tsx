/**
 * C6 방명록 관리.
 *
 * 숨김과 삭제를 명확히 구분합니다 — 하객이 남긴 축하 메시지이고 삭제는 되돌릴 수 없습니다.
 */
import { Placeholder } from './_Placeholder';

export default function Guestbook() {
  return (
    <Placeholder
      screen="C6 방명록 관리"
      title="방명록 관리"
      desc="목록 · 숨기기 · 삭제 · 숨긴 것만 보기 · 총 개수"
    />
  );
}
