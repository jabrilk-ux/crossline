import { Pressable, Text, View } from 'react-native';
import type { ButtonProps } from 'react-native';
import { colors, typography } from '../constants/theme';
export default function ActionButton({ title, onPress, disabled, color, accessibilityLabel, variant = 'primary' }: ButtonProps & { variant?: 'primary' | 'row' | 'secondary' }) {
  const row = variant === 'row';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({pressed}) => ({ minHeight: row ? 50 : 56, borderRadius: row ? 0 : 16, paddingHorizontal: row ? 0 : 18, paddingVertical: 12, flexDirection:'row', alignItems:'center', justifyContent:row?'space-between':'center', backgroundColor:row?'transparent':variant==='secondary'?colors.surfaceRaised:colors.sky, borderBottomWidth:row?1:0, borderBottomColor:colors.divider, opacity:disabled?0.4:pressed?0.75:1 })}>
    <Text style={{fontFamily:row?typography.body.fontFamily:typography.h2.fontFamily,fontSize:row?15:17,color:color ?? colors.white, flexShrink:1}}>{title}</Text>
    {row && <Text style={{color:color ?? colors.muted,fontSize:20}}>›</Text>}
  </Pressable>;
}
