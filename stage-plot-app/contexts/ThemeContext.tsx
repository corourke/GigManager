import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { PersistenceService } from '../services/PersistenceService';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('auto');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await PersistenceService.getTheme();
        setThemeState(savedTheme || 'auto');
        if (savedTheme === 'auto') {
          setColorScheme('system');
        } else {
          setColorScheme(savedTheme || 'auto');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        setThemeState('auto');
        setColorScheme('system');
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      await PersistenceService.saveTheme(newTheme);
      if (newTheme === 'auto') {
        setColorScheme('system');
      } else {
        setColorScheme(newTheme);
      }
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
