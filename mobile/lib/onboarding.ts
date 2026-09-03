import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'jp.onboarding.seen';
const LEGAL_KEY = 'jp.legal.accepted';

async function readFlag(key: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) === '1';
    }
    return (await SecureStore.getItemAsync(key)) === '1';
  } catch {
    return false;
  }
}

async function writeFlag(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, '1');
      return;
    }
    await SecureStore.setItemAsync(key, '1');
  } catch {
    /* ignore */
  }
}

export async function getWelcomeState() {
  const [seenOnboarding, acceptedLegal] = await Promise.all([
    readFlag(ONBOARDING_KEY),
    readFlag(LEGAL_KEY),
  ]);
  return { seenOnboarding, acceptedLegal };
}

export async function markOnboardingSeen() {
  await writeFlag(ONBOARDING_KEY);
}

export async function markLegalAccepted() {
  await writeFlag(LEGAL_KEY);
}
