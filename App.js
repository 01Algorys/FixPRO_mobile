import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { initLanguage } from './src/i18n';

// Loads the language before anything else: AppRoot is required only then, so
// its screens, and the labels they define at the top of their files, are built
// in the right language. Changing language reloads the app (see src/i18n).
export default function App() {
  const [Root, setRoot] = useState(null);

  useEffect(() => {
    initLanguage().then((ready) => {
      if (ready) setRoot(() => require('./src/AppRoot').default);
    });
  }, []);

  return Root ? <Root /> : <View style={{ flex: 1, backgroundColor: '#1a56db' }} />;
}
