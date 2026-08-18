/**
 * 메인 사이트 라우터.
 *
 * 화면 코드(B1·C4 …)는 `docs/05-design-brief.md` 와 디자인 산출물의 `data-screen-label` 에 대응합니다.
 * 마케팅 화면(B*)은 즉시 로드하고, 로그인 뒤에만 쓰는 화면(C*)은 코드 분할합니다 —
 * 처음 방문한 사람이 에디터 번들을 받을 이유가 없습니다.
 */
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SiteLayout } from '@/components/SiteLayout';
import { AppLayout } from '@/components/AppLayout';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenFallback } from '@/components/ScreenFallback';

import Home from '@/routes/Home';
import Invitation from '@/routes/Invitation';
import Film from '@/routes/Film';
import Card from '@/routes/Card';
import Samples from '@/routes/Samples';
import NotFound from '@/routes/NotFound';

const Login = lazy(() => import('@/routes/Login'));
const SocialCallback = lazy(() => import('@/routes/SocialCallback'));
const Dashboard = lazy(() => import('@/routes/Dashboard'));
const NewInvitation = lazy(() => import('@/routes/NewInvitation'));
const Editor = lazy(() => import('@/routes/Editor'));
const Publish = lazy(() => import('@/routes/Publish'));
const Guestbook = lazy(() => import('@/routes/Guestbook'));
const Admin = lazy(() => import('@/routes/Admin'));
const AdminLogs = lazy(() => import('@/routes/AdminLogs'));

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
          {/* 운영자 전용. 화면은 누구나 열 수 있고, 목록은 서버가 403 으로 막습니다 */}
          <Route path="admin" element={<Admin />} />
          <Route path="admin/logs" element={<AdminLogs />} />
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
