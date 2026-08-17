import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setProvidedFonts } from '@luvi/schema';
import App from './App';
import './styles/fonts.css';
import './index.css';

// fonts.css 가 Pretendard·나눔명조·Cormorant Garamond 를 self-host 하므로
// 이 셋은 CDN 에서 또 받지 않습니다.
// 그 외 글꼴은 커버 레이어가 실제로 쓸 때만 ensureFonts() 가 붙입니다.
setProvidedFonts(['sans', 'serif', 'cormorant']);

// 캘린더(?calendar=1) 처리는 데이터를 받은 뒤라야 하므로 App 안에서 합니다.
const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
