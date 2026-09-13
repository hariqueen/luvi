import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import './styles/globals.css';

// 소비자 앱의 setProvidedFonts() 는 여기 없습니다 — 이 콘솔은 청첩장 콘텐츠를
// 렌더하지 않으므로 @luvi/schema 의 글꼴 로더를 탈 일이 없습니다.

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
