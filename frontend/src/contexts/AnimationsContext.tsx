/**
 * AnimationsProvider — ONLY exports a React component (Fast Refresh compatible).
 * The AnimationsContext object lives in animationsContextDef.ts.
 * The useAnimationsEnabled hook lives in hooks/useAnimationsEnabled.ts.
 */
import React, { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { selectAnimationsEnabled } from '@/store/slices/settingsSlice';
import { AnimationsContext } from './animationsContextDef';

export const AnimationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const enabled = useSelector(selectAnimationsEnabled);
  return (
    <AnimationsContext.Provider value={enabled}>
      {children}
    </AnimationsContext.Provider>
  );
};
