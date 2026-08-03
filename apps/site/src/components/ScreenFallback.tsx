/** 코드 분할 로딩 중 표시. 스피너보다 브랜드 워드마크가 대기감을 덜 준다. */
export function ScreenFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <span className="animate-pulseSoft font-script text-[34px] text-gold">Luvi</span>
    </div>
  );
}
