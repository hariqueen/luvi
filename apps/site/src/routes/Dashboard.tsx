/**
 * C2 대시보드 — 내 청첩장.
 *
 * 상태 배지 4종을 시각적으로 구분해야 합니다. 특히 `발행됨 · 변경 N건` 이 중요합니다 —
 * "고쳤는데 왜 안 바뀌지?" 를 원천에서 막아주는 표시입니다.
 */
import { Placeholder } from './_Placeholder';

export default function Dashboard() {
  return (
    <Placeholder
      screen="C2 대시보드"
      title="내 청첩장"
      desc="카드 목록 · 상태 배지(초안 / 발행됨 / 발행됨·변경 N건 / 보관됨) · 편집·공유·방명록"
    />
  );
}
