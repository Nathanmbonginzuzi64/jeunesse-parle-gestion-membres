import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { JP_DARK, JP_LIGHT, type JpColors } from '@/constants/theme';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_KEY = 'jp_theme_preference';

type ThemeContextValue = {
  colors: JpColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    void SecureStore.setItemAsync(THEME_KEY, value).catch(() => undefined);
  }, []);

  const isDark = useMemo(() => {
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return system === 'dark';
  }, [preference, system]);

  const toggleDark = useCallback(() => {
    setPreference(isDark ? 'light' : 'dark');
  }, [isDark, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? JP_DARK : JP_LIGHT,
      isDark,
      preference: ready ? preference : 'system',
      setPreference,
      toggleDark,
    }),
    [isDark, preference, ready, setPreference, toggleDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      colors: JP_LIGHT,
      isDark: false,
      preference: 'light',
      setPreference: () => undefined,
      toggleDark: () => undefined,
    };
  }
  return ctx;
}
