import { ReactNode, useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../../store/legacyStore';
import { QueryProvider } from './QueryProvider';
import { useUIStore } from '../../store/uiStore';

function ThemeApplier() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryProvider>
          <ThemeApplier />
          {children}
        </QueryProvider>
      </PersistGate>
    </ReduxProvider>
  );
}
