
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#2D6A4F',  
          dark:    '#1B4332',  
          accent:  '#D4832A',  
          light:   '#EAF2EC',  
          bar:     '#95C4A8',  
        },
        surface: {
          bg:      '#F5F3EF',  
          card:    '#FFFFFF',  
          raised:  '#F0EDE8',  
          border:  '#DDD9D2',  
          divider: '#E8E4DE',  
          input:   '#ECEAE5',  
          iborder: '#C8C4BC',  
          header:  '#2D6A4F',  
        },
      },
      borderRadius: {
        card:  '6px',
        inner: '4px',
        btn:   '4px',
        pill:  '999px',
      },
    },
  },
  plugins: [],
};
