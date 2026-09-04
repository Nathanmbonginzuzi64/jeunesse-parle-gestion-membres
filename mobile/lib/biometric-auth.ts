/**
 * Connexion par biométrie téléphone (empreinte / Face ID).
 * Les identifiants sont stockés localement après opt-in — uniquement pour l’auth.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIO_ENABLED = 'jp_bio_enabled';
const BIO_LOGIN = 'jp_bio_login';
const BIO_SECRET = 'jp_bio_secret';

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'empreinte digitale';
    }
  } catch {
    /* ignore */
  }
  return 'biométrie';
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIO_ENABLED)) === '1';
  } catch {
    return false;
  }
}

export async function enableBiometricLogin(login: string, password: string): Promise<boolean> {
  const available = await isBiometricHardwareAvailable();
  if (!available) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirmer pour activer la connexion biométrique',
    cancelLabel: 'Annuler',
    disableDeviceFallback: false,
  });

  if (!result.success) return false;

  await SecureStore.setItemAsync(BIO_ENABLED, '1');
  await SecureStore.setItemAsync(BIO_LOGIN, login.trim());
  await SecureStore.setItemAsync(BIO_SECRET, password);
  return true;
}

export async function disableBiometricLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(BIO_ENABLED);
  await SecureStore.deleteItemAsync(BIO_LOGIN);
  await SecureStore.deleteItemAsync(BIO_SECRET);
}

export async function authenticateWithBiometrics(): Promise<{
  login: string;
  password: string;
} | null> {
  if (!(await isBiometricLoginEnabled())) return null;
  if (!(await isBiometricHardwareAvailable())) return null;

  const login = await SecureStore.getItemAsync(BIO_LOGIN);
  const password = await SecureStore.getItemAsync(BIO_SECRET);
  if (!login || !password) return null;

  const label = await getBiometricLabel();
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Connexion Jeunesse Parle (${label})`,
    cancelLabel: 'Annuler',
    disableDeviceFallback: false,
  });

  if (!result.success) return null;
  return { login, password };
}

/** Après un login mot de passe réussi : met à jour le secret biométrique si déjà activé. */
export async function syncBiometricCredentials(login: string, password: string): Promise<void> {
  if (!(await isBiometricLoginEnabled())) return;
  await SecureStore.setItemAsync(BIO_LOGIN, login.trim());
  await SecureStore.setItemAsync(BIO_SECRET, password);
}
