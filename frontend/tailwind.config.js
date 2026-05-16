module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nb: {
          bg:             '#0C0C0D',
          surface:        '#141415',
          border:         '#2C2C2E',
          'border-bright':'#3A3A3C',
          text:           '#E0E0E2',
          muted:          '#6E6E73',
          dim:            '#404040',
          cyan:           '#00D4FF',
          emerald:        '#00C853',
          red:            '#FF453A',
          amber:          '#FFB340',
        }
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Cascadia Code'", "'Fira Mono'", 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '2px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        full: '9999px',
      },
    }
  }
}
