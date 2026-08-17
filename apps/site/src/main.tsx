import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setProvidedFonts } from '@luvi/schema';
import App from './App';
import { AuthProvider } from './lib/auth';
import './styles/globals.css';

// globals.css 가 Pretendard(UI 기본)와 Parisienne(Luvi 워드마크)를 상시 로드합니다.
// 나머지 글꼴은 레이어가 실제로 쓸 때 ensureFonts() 가 붙입니다.
setProvidedFonts(['sans', 'parisienne']);

const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

createRoot(container).render(
  <StrictMode>
    {/* AuthProvider 는 현재 경로에 따라 firebase 를 늦게 불러오므로 라우터 안쪽에 있어야 합니다 */}
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
