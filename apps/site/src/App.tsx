/**
 * 메인 사이트 라우터.
 *
 * 화면 코드(B1·C4 …)는 저장소 루트의 `docs/05-design-brief.md` 와 디자인 산출물의 `data-screen-label` 에 대응합니다.
 * 마케팅 화면(B*)은 즉시 로드하고, 로그인 뒤에만 쓰는 화면(C*)은 코드 분할합니다 —
 * 처음 방문한 사람이 에디터 번들을 받을 이유가 없습니다.
 */
import { Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SiteLayout } from '@/components/SiteLayout';
import { AppLayout } from '@/components/AppLayout';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenFallback } from '@/components/ScreenFallback';
import { lazyPage } from '@/lib/lazyPage';

import Home from '@/routes/Home';
import Invitation from '@/routes/Invitation';
import Film from '@/routes/Film';
import Card from '@/routes/Card';
import Samples from '@/routes/Samples';
import NotFound from '@/routes/NotFound';

// 법률 문서는 마크다운 원문을 통째로 품고 있어 번들이 작지 않습니다.
// 대부분의 방문자가 열지 않으므로 분할합니다 — 동의 화면에서 새 탭으로 엽니다.
const Legal = lazyPage(() => import('@/routes/Legal'));
// 공지사항도 원문을 상수로 품고 있고 대부분 열지 않습니다 — 같은 이유로 분할합니다.
const Notice = lazyPage(() => import('@/routes/Notice'));
const Support = lazyPage(() => import('@/routes/Support'));
const InquiryThread = lazyPage(() => import('@/routes/InquiryThread'));
const AdminInquiries = lazyPage(() => import('@/routes/AdminInquiries'));
const Login = lazyPage(() => import('@/routes/Login'));
const SocialCallback = lazyPage(() => import('@/routes/SocialCallback'));
const Dashboard = lazyPage(() => import('@/routes/Dashboard'));
const NewInvitation = lazyPage(() => import('@/routes/NewInvitation'));
const Editor = lazyPage(() => import('@/routes/Editor'));
const Publish = lazyPage(() => import('@/routes/Publish'));
const Guestbook = lazyPage(() => import('@/routes/Guestbook'));
const Account = lazyPage(() => import('@/routes/Account'));
const Admin = lazyPage(() => import('@/routes/Admin'));

export default function App() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        {/* ── 브랜드 · 마케팅 ── */}
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="invitation" element={<Invitation />} />
          <Route path="film" element={<Film />} />
          <Route path="card" element={<Card />} />
          <Route path="samples" element={<Samples />} />
          <Route path="samples/:themeId" element={<Samples />} />
          {/* 법정 게시물 — 푸터·로그인·동의 화면이 모두 여기를 가리킵니다 */}
          <Route path="terms" element={<Legal kind="terms" />} />
          <Route path="privacy" element={<Legal kind="privacy" />} />
          {/* 방침 제14조 ② 가 약속한 고지 창구 — 개정 예고가 여기 올라갑니다 */}
          <Route path="notice" element={<Notice />} />
          <Route path="notice/:id" element={<Notice />} />
          {/* 고객센터 — FAQ + 문의. 푸터 '문의' 가 여기를 가리킵니다 */}
          <Route path="support" element={<Support />} />
          {/*
            조회 링크. **비로그인도 열 수 있어야 하므로** RequireAuth 밖에 둡니다 —
            토큰 자체가 접근 권한이고, 로그인을 요구하면 링크를 보낸 의미가 없습니다.
          */}
          <Route path="support/t/:token" element={<InquiryThread />} />
        </Route>

        {/* ── 로그인 (레이아웃 없음 — 집중형 화면) ── */}
        <Route path="login" element={<Login />} />
        {/* 카카오·네이버가 되돌려보내는 지점. 제공자 콘솔에 이 경로를 등록해야 한다 */}
        <Route path="login/callback/:provider" element={<SocialCallback />} />

        {/* ── 계정 · 제작 ── */}
        <Route
          path="app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewInvitation />} />
          <Route path="i/:id/guestbook" element={<Guestbook />} />
          {/* 방침 제8조 ②가 가리키는 화면 — 열람·정정·동의철회·탈퇴 */}
          <Route path="account" element={<Account />} />
          {/* 운영자 전용. 화면은 누구나 열 수 있고, 목록은 서버가 403 으로 막습니다 */}
          <Route path="admin" element={<Admin />} />
          <Route path="admin/inquiries" element={<AdminInquiries />} />
        </Route>

        {/*
          에디터·발행은 전체화면을 써야 해서 AppLayout(사이드바·헤더) 밖에 둡니다.
          모바일에서는 프리뷰가 화면을 가득 채우고 폼이 바텀시트로 올라옵니다.
        */}
        <Route
          path="app/i/:id"
          element={
            <RequireAuth>
              <Outlet />
            </RequireAuth>
          }
        >
          <Route path="edit" element={<Editor />} />
          <Route path="publish" element={<Publish />} />
        </Route>

        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
