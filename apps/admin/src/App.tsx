/**
 * 운영자 콘솔 라우터.
 *
 * 소비자 앱과 달리 **로그인 없이 볼 화면이 하나도 없습니다.** 그래서 가드를 라우트마다
 * 흩뿌리지 않고 트리 전체를 `RequireAdmin` 하나로 감쌉니다 — 화면을 새로 추가할 때
 * 가드를 빠뜨려 그 화면만 열리는 일이 구조적으로 불가능해집니다.
 *
 * 화면을 숨기는 것은 권한의 근거가 아닙니다. 경계는 Cloudflare Access(호스트 앞)와
 * Worker 의 `usersRepo.isAdmin()`(매 요청) 둘입니다.
 */
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { RequireAdmin } from '@/components/RequireAdmin';
import { ScreenFallback } from '@/components/ScreenFallback';
import { lazyPage } from '@/lib/lazyPage';

const Inquiries = lazyPage(() => import('@/routes/Inquiries'));
const InquiryDetail = lazyPage(() => import('@/routes/InquiryDetail'));
const Users = lazyPage(() => import('@/routes/Users'));
const UserDetail = lazyPage(() => import('@/routes/UserDetail'));
const Invitations = lazyPage(() => import('@/routes/Invitations'));
const NotFound = lazyPage(() => import('@/routes/NotFound'));

export default function App() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          {/* 운영자가 아침에 여는 첫 화면은 "누가 무엇을 물었나" 입니다 */}
          <Route index element={<Navigate to="/inquiries" replace />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="inquiries/:id" element={<InquiryDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:uid" element={<UserDetail />} />
          <Route path="invitations" element={<Invitations />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
