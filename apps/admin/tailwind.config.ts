import type { Config } from 'tailwindcss';
import preset from '@luvi/ui/tailwind-preset';

export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // 공용 컴포넌트의 클래스도 스캔 대상에 넣어야 purge 되지 않는다
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
