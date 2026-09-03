import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SplashBrand } from '@/components/splash-brand';
import { useAuth } from '@/lib/auth';
import { getWelcomeState } from '@/lib/onboarding';

const SPLASH_MS = 2800;

/** Chargement d’ouverture, puis onboarding, documents légaux, connexion ou app. */
export default function Index() {
  const { user, loading, postLoginPath } = useAuth();
  const router = useRouter();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !minTimeElapsed || navigated.current) return;

    void (async () => {
      if (user) {
        navigated.current = true;
        router.replace(postLoginPath(user) as never);
        return;
      }

      const { seenOnboarding, acceptedLegal } = await getWelcomeState();
      navigated.current = true;
      if (!seenOnboarding) {
        router.replace('/(auth)/bienvenue');
        return;
      }
      if (!acceptedLegal) {
        router.replace('/(auth)/confidentialite');
        return;
      }
      router.replace('/(auth)/connexion');
    })();
  }, [loading, minTimeElapsed, user, router, postLoginPath]);

  return (
    <SplashBrand
      onReady={() => {
        void SplashScreen.hideAsync();
      }}
    />
  );
}
