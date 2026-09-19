import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
export default function Index() {
  const { userId, isOnboarded } = useUserStore();
  return <Redirect href={!userId ? '/(auth)/welcome' : !isOnboarded ? '/(auth)/onboarding' : '/(tabs)/home'} />;
}
