import type { Preview } from '@storybook/react-vite';
import '../client/global.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'FeexSystems Dark',
      values: [
        { name: 'FeexSystems Dark', value: '#05070A' },
        { name: 'Surface 1', value: '#0d1117' },
        { name: 'Light', value: '#ffffff' },
      ],
    },
    a11y: {
      // 'error' means CI fails on a11y violations — enforced per plan Task 56
      test: 'error',
    },
  },
};

export default preview;
