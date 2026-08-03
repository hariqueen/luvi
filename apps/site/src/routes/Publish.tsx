/**
 * C5 발행 · 공유.
 *
 * 공유 경로가 2개이고 결과가 다릅니다 — SDK 공유로 보낸 메시지에만 버튼이 붙고,
 * URL 을 복사해 붙여넣으면 OG 미리보기(버튼 없음)가 나옵니다. 카카오 정책이라 우회할 수 없으므로
 * 두 경로의 차이를 화면에서 그대로 보여주는 편이 정직합니다.
 */
import { Placeholder } from './_Placeholder';

export default function Publish() {
  return (
    <div className="min-h-dvh bg-bg">
      <Placeholder
        screen="C5 발행 공유"
        title="발행하고 공유하기"
        desc="변경사항 요약 · 필수 항목 검증 · 링크 복사 · 카카오톡 공유 미리보기 · QR 다운로드"
      />
    </div>
  );
}
