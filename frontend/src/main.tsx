import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import AppRouter from './AppRouter';
import './index.css';
import { initTheme } from './hooks/useTheme';

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppRouter />
    </MotionConfig>
  </StrictMode>,
);
