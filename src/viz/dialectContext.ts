// Which language's words the board uses (see dialect.ts). JavaScript unless a view sets it.
import { createContext, useContext } from 'react';
import type { Dialect } from './dialect';

export const DialectContext = createContext<Dialect>('javascript');

export const useDialect = (): Dialect => useContext(DialectContext);
