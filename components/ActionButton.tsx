import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, Text } from 'react-native';
import type { ButtonProps } from 'react-native';
import { colors, typography } from '../constants/theme';
export default function ActionButton({ title, onPress, disabled, color, accessibilityLabel, variant = 'primary' }: ButtonProps & { variant?: 'primary' | 'row' | 'secondary' }) {
  const row = variant === 'row';
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useRef(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) reducedMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => { active = false; subscription.remove(); scale.stopAnimation(); };
  }, [scale]);
  function animate(toValue: number) {
    Animated.timing(scale, { toValue: reducedMotion.current ? 1 : toValue, duration: 120, useNativeDriver: Platform.OS !== 'web' }).start();
  }
  return <Animated.View style={{ transform: [{ scale }], flexShrink: 0 }}><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} onPressIn={() => animate(0.98)} onPressOut={() => animate(1)} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => ({ minHeight: row ? 50 : 56, borderRadius: row ? 0 : 16, paddingHorizontal: row ? 0 : 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: row ? 'space-between' : 'center', backgroundColor: row ? 'transparent' : hovered && !disabled ? '#254d73' : variant === 'secondary' ? colors.surfaceRaised : colors.sky, borderBottomWidth: row ? 1 : 0, borderBottomColor: colors.divider, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 })}>
    <Text style={{ fontFamily: row ? typography.body.fontFamily : typography.h2.fontFamily, fontSize: row ? 15 : 17, color: color ?? colors.white, flexShrink: 1 }}>{title}</Text>
    {row && <Text style={{ color: color ?? colors.muted, fontSize: 20 }}>›</Text>}
  </Pressable></Animated.View>;
}
