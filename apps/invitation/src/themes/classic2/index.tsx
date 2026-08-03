/**
 * classic2 테마 — 아직 이식 전입니다.
 *
 * 디자인 원본은 저장소 밖 `classic2/index.html` (순수 HTML 547줄)에 있습니다.
 * 그걸 sections/ 컴포넌트로 옮기면 이 파일이 classic1 처럼 화면 순서를 정의합니다.
 *
 * 일부러 classic1 로 대체하지 않습니다 — 조용히 다른 디자인이 나가면
 * 어느 청첩장이 잘못된 테마로 발행됐는지 알 수 없게 됩니다.
 */
export default function Classic2Theme() {
  return (
    <div className="mx-auto flex min-h-screen max-w-page items-center justify-center bg-ivory p-8 text-center font-sans text-ink">
      <div>
        <p className="text-lg font-bold">준비 중인 디자인입니다</p>
        <p className="mt-2 text-sm opacity-70">
          classic2 테마는 아직 이식되지 않았습니다.
        </p>
      </div>
    </div>
  );
}
