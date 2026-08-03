/**
 * 청첩장 렌더러의 진입점.
 *
 * 이 파일은 화면을 그리지 않습니다 — themeId 를 보고 어떤 테마를 그릴지만 고릅니다.
 * 실제 화면은 src/themes/{themeId}/ 안에 있습니다.
 *
 * 테마는 lazy 로 불려오므로 첫 페인트 전에 아주 짧은 공백이 생깁니다.
 * 흰 화면이 번쩍이지 않도록 fallback 도 청첩장과 같은 배경색을 씁니다.
 */
import { Suspense } from 'react';
import { invitation } from '@/config/invitation.config';
import { THEMES } from '@/themes/registry';

export default function App() {
  const Theme = THEMES[invitation.themeId];

  return (
    <Suspense
      fallback={<div className="mx-auto min-h-screen max-w-page bg-ivory" aria-hidden />}
    >
      <Theme />
    </Suspense>
  );
}
