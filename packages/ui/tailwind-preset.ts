/**
 * 모든 앱이 공유하는 Tailwind 프리셋.
 * 토큰 값은 `src/tokens.ts` 한 곳에서만 관리합니다.
 *
 * 사용법 — 각 앱의 tailwind.config.ts 에서:
 *   import preset from '@luvi/ui/tailwind-preset';
 *   export default { presets: [preset], content: [...] };
 */
import type { Config } from 'tailwindcss';
import { colors, fonts, maxWidth, screens } from './src/tokens';

const preset: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: [...fonts.sans],
        script: [...fonts.script],
      },
      screens: { ...screens },
      maxWidth: { ...maxWidth },
      borderRadius: {
        // 디자인의 기기 프레임 곡률
        phone: '35px',
        'phone-outer': '42px',
      },
      keyframes: {
        luviFloat: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        luviPulse: {
          '0%,100%': { opacity: '.35' },
          '50%': { opacity: '1' },
        },
        luviCue: {
          '0%,100%': { transform: 'translateY(0)', opacity: '.25' },
          '50%': { transform: 'translateY(7px)', opacity: '1' },
        },
        luviMarquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        luviPetal: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '0' },
          '15%': { opacity: '.7' },
          '100%': { transform: 'translateY(320px) rotate(220deg)', opacity: '0' },
        },
        luviScroll: {
          '0%,8%': { transform: 'translateY(0)' },
          '45%,55%': { transform: 'translateY(-42%)' },
          '92%,100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'luviFloat 4s ease-in-out infinite',
        pulseSoft: 'luviPulse 2.4s ease-in-out infinite',
        cue: 'luviCue 1.8s ease-in-out infinite',
        marquee: 'luviMarquee 28s linear infinite',
        petal: 'luviPetal 9s linear infinite',
        scrollPeek: 'luviScroll 9s ease-in-out infinite',
      },
    },
  },
};

export default preset;
