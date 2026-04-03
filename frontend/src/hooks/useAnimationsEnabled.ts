/**
 * useAnimationsEnabled hook — standalone .ts file (Fast Refresh compatible).
 * Uses AnimationsContext from animationsContextDef.ts directly.
 */
import { useContext } from 'react';
import { AnimationsContext } from '@/contexts/animationsContextDef';

export const useAnimationsEnabled = (): boolean => useContext(AnimationsContext);
