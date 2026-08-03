/**
 * C3 템플릿 선택.
 *
 * 선택하면 **샘플 데이터가 채워진 초안**을 만듭니다.
 * 빈 폼에서 시작하게 하면 이탈이 훨씬 큽니다 — 완성된 화면을 먼저 보여주고 하나씩 바꾸게 합니다.
 */
import { Placeholder } from './_Placeholder';

export default function NewInvitation() {
  return (
    <Placeholder
      screen="C3 템플릿 선택"
      title="어떤 템플릿으로 시작할까요"
      desc="선택하면 샘플 내용이 채워진 초안이 만들어집니다. 내용은 나중에 전부 바꿀 수 있어요."
    />
  );
}
