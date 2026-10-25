import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, localStorageColorSchemeManager } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { CodeHighlightAdapterProvider } from '@mantine/code-highlight';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/code-highlight/styles.css';
import '@kvmb/react-data-grid/styles.css';
import './docs.css';
import { App } from './App';
import { highlightJsAdapter } from './highlight';

const theme = createTheme({ primaryColor: 'indigo', defaultRadius: 'md' });
const colorSchemeManager = localStorageColorSchemeManager({ key: 'mdg-docs-color-scheme' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto" colorSchemeManager={colorSchemeManager}>
      <CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
        <DatesProvider settings={{ firstDayOfWeek: 1 }}>
          <App />
        </DatesProvider>
      </CodeHighlightAdapterProvider>
    </MantineProvider>
  </StrictMode>,
);
