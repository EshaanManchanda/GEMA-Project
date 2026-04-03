/**
 * AnimationsContext object — in a .ts file (no JSX) so it can be imported
 * by AnimationsProvider (.tsx) and useAnimationsEnabled (.ts) separately,
 * keeping each file Vite Fast Refresh compatible.
 */
import { createContext } from 'react';

// Exported so both the Provider and the hook can use the same context object
export const AnimationsContext = createContext<boolean>(true);
