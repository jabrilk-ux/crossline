import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/userStore';

export function useSubscription() {
  const router = useRouter();
  const tier = useUserStore(s => s.subscriptionTier);

  const openPaywall = useCallback(() => {
    router.push('/paywall');
  }, [router]);

  return {
    tier,
    isPro: tier === 'pro' || tier === 'pro_plus',
    isProPlus: tier === 'pro_plus',
    openPaywall,
  };
}
