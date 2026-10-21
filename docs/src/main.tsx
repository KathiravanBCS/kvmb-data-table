import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, localStorageColorSchemeManager } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@kvmb/react-data-grid/styles.css';
import './docs.css';
import { App } from './App';

const theme = createTheme({ primaryColor: 'indigo', defaultRadius: 'md' });
const colorSchemeManager = localStorageColorSchemeManager({ key: 'mdg-docs-color-scheme' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto" colorSchemeManager={colorSchemeManager}>
      <DatesProvider settings={{ firstDayOfWeek: 1 }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
