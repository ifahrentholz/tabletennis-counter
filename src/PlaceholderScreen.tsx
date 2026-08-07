import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { getWelcomeMessage } from './appInfo';

/**
 * Minimal placeholder screen for the initial project scaffold (ticket #1).
 * Later tickets replace this with real navigation and screens
 * (match list, setup form, live counter, etc.).
 */
export function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getWelcomeMessage()}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
