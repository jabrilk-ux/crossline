import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { completeAuthCallback } from '../services/authCallback';
import { colors } from '../constants/theme';
export default function AuthCallback() {
  const url = Linking.useURL();
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your email…');
  useEffect(() => {
    if (!url) return;
    let active = true;
    void (async () => {
      const recovery = await completeAuthCallback(url);
      if (active) router.replace(recovery ? '/reset-password' : '/');
    })().catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [url]);
  return <View style={{ flex: 1, padding: 30, justifyContent: 'center', backgroundColor: colors.navy, gap: 20 }}><Text style={{ color: colors.white }}>{message}</Text><Button title="Back" onPress={() => router.replace('/')} /></View>;
}
