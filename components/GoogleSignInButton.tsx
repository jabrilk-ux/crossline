import { useState } from 'react';
import { Image, Platform, Pressable } from 'react-native';
import { colors } from '../constants/theme';

export function GoogleSignInButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  const isIOS = Platform.OS === 'ios';

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel="Sign in with Google"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    style={{
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      padding: 2,
      borderWidth: 2,
      borderRadius: 8,
      borderColor: focused ? colors.sky : 'transparent',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <Image
      accessible={false}
      source={isIOS ? require('../assets/google/sign-in-ios.png') : require('../assets/google/sign-in-android-web.png')}
      resizeMode="contain"
      style={{ width: isIOS ? 188 : 180, height: isIOS ? 44 : 40 }}
    />
  </Pressable>;
}
