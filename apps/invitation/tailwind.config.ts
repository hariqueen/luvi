import type { Config } from 'tailwindcss';

/**
 * 원본 인라인 스타일에서 쓰던 디자인 토큰을 Tailwind 시맨틱 유틸리티로 매핑.
 * 색/여백/반경/그림자/폰트/애니메이션을 여기서 한 곳에 정의해두면,
 * 다른 청첩장 테마도 이 파일 값만 바꿔 재사용할 수 있습니다.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FBF6F1',
        cream: '#F3E9DF',
        rose: {
          DEFAULT: '#C77B8B',
          deep: '#A65A6E',
        },
        sage: '#93A98C',
        gold: '#C0A06A',
        ink: {
          DEFAULT: '#3A332E',
          soft: '#857569', // 원본 --ink2
        },
        line: '#ece1d7',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          'ui-sans-serif',
          'system-ui',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        cormorant: ['Cormorant Garamond', 'serif'],
        myeongjo: ['Nanum Myeongjo', 'serif'],
      },
      borderRadius: {
        none: '0',
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '16px',
        '3xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.04)',
        sm: '0 1px 3px rgba(0,0,0,0.06)',
        md: '0 4px 12px rgba(0,0,0,0.06)',
        lg: '0 8px 24px rgba(0,0,0,0.12)',
        xl: '0 20px 48px rgba(28, 36, 64, 0.16)',
      },
      maxWidth: {
        page: '430px', // 모바일 청첩장 고정 폭
      },
      keyframes: {
        // petalFall / eq 는 요소별 duration·delay가 달라 index.css 전역 @keyframes로 정의
        sparkle: {
          '0%,100%': { opacity: '0', transform: 'scale(.3)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        floatY: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        bob: {
          '0%,100%': { transform: 'translateY(0) rotate(-4deg)' },
          '50%': { transform: 'translateY(-6px) rotate(4deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(.85)', opacity: '.6' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        wobble: {
          '0%,100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
        pop: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        sparkle: 'sparkle 2s ease-in-out infinite',
        floatY: 'floatY 2.4s ease-in-out infinite',
        bob: 'bob 2.4s ease-in-out infinite',
        pulseRing: 'pulseRing 2s ease-out infinite',
        fadeUp: 'fadeUp .2s ease',
        wobble: 'wobble 3s ease-in-out infinite',
        'wobble-fast': 'wobble 1.6s ease-in-out infinite',
        pop: 'pop .3s ease',
        // petalFall / eq 는 요소마다 duration·delay가 달라 인라인 style로 적용
      },
    },
  },
  plugins: [],
} satisfies Config;
