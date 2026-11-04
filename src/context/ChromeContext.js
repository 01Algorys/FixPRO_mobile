import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Colours of the status-bar and home-indicator strips that the app's root view
// paints around every screen. A screen with a different edge colour (e.g. the
// white auth screens) overrides them while it is focused.
const ChromeContext = createContext({ chrome: null, setChrome: () => {} });

export const ChromeProvider = ({ children }) => {
  const [chrome, setChrome] = useState(null);
  return <ChromeContext.Provider value={{ chrome, setChrome }}>{children}</ChromeContext.Provider>;
};

export const useChromeColors = () => useContext(ChromeContext).chrome;

let nextOwner = 0;

export const useScreenChrome = (top, bottom = top) => {
  const { setChrome } = useContext(ChromeContext);
  const owner = useRef(++nextOwner).current;
  useFocusEffect(
    useCallback(() => {
      setChrome({ top, bottom, owner });
      // The next screen's focus can run before this blur, so only clear our own
      return () => setChrome((current) => (current?.owner === owner ? null : current));
    }, [top, bottom])
  );
};
