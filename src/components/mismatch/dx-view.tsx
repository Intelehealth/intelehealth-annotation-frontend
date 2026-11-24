'use client';

/**
 * #35 Which AI diagnosis view the dashboard shows. In "+ Written by doctor" an equivalent suggestion counts as a
 * pick (dxMatchView), so "Equivalent listed, not picked" is already inside Top 5 there and is not shown.
 */
import { createContext, useContext } from 'react';

const WrittenView = createContext(false);
export const WrittenViewProvider = WrittenView.Provider;
export const useWrittenView = () => useContext(WrittenView);
