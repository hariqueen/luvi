/**
 * 문의함 (B1) — 이 콘솔에서 값어치가 가장 큰 화면입니다. 다음 단계에서 만듭니다.
 *
 * 지금은 답변을 메일로 하고 있어서 기록이 Gmail 에 흩어집니다. 여기로 옮기면
 * 스레드 하나에 고객 글·운영자 답변·상태·내부 메모가 모입니다.
 *
 * 이식할 것: `apps/site/src/routes/AdminInquiries.tsx` (읽기 전용 목록이 이미 있습니다).
 * 데이터 모델은 `docs/08-support-plan.md` 5장 그대로입니다.
 */
import { Pending } from '@/components/Pending';

export default function Inquiries() {
  return (
    <Pending
      title="문의"
      section="5장 B1·B2"
      points={[
        'apps/site 의 AdminInquiries 목록을 이식하고 상태 필터·미확인 배지를 더합니다',
        '상세에서 답변을 씁니다 — messages 에 author: admin 으로 추가하고 상위 문서의 status·lastMessage·unreadForUser 를 갱신합니다',
        '답변하면 고객에게 알림 메일을 보냅니다. 답변 전문을 본문에 넣고, 광고는 한 줄도 섞지 않습니다',
        '메일 실패가 답변 저장 실패가 되면 안 됩니다 — ctx.waitUntil() 로 띄웁니다',
        '입력은 평문으로 렌더합니다. 마크다운·HTML 을 해석하지 않습니다',
        '옆 패널에 회원 링크·관련 청첩장·최근 14일 오류 이벤트를 붙입니다',
      ]}
    />
  );
}
