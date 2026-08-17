import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/fonts.css';
import './index.css';

// 캘린더(?calendar=1) 처리는 데이터를 받은 뒤라야 하므로 App 안에서 합니다.
const container = document.getElementById('root');
if (!container) throw new Error('#root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
