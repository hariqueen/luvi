import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { redirectToCalendarIfRequested } from '@/lib/calendar';
import './styles/fonts.css';
import './index.css';

// 카카오 공유의 "일정 등록" 버튼은 등록된 도메인만 가리킬 수 있어
// 이 페이지(?calendar=1)를 거쳐 구글 캘린더로 넘어갑니다.
// 청첩장을 그리기 전에 처리해 화면 깜빡임을 줄입니다.
if (!redirectToCalendarIfRequested()) {
  const container = document.getElementById('root');
  if (!container) throw new Error('#root element not found');

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
