import { useId } from 'react';
import Svg, { ClipPath, Defs, Path, Image } from 'react-native-svg';
import { View } from 'react-native';
import shapes from '../constants/state-shapes.json';
import { stateFlags } from '../constants/stateFlags';
import { colors } from '../constants/theme';
export default function StateSilhouette({ code, height = 170 }: { code: string; height?: number }) {
  const id = 'state' + useId().replace(/:/g,'');
  const shape = (shapes as Record<string,{W:number;H:number;d:string}>)[code];
  if (!shape) return null;
  return <View accessibilityLabel={`${code} state silhouette`} style={{height,width:'100%',paddingVertical:8}}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${shape.W} ${shape.H}`} preserveAspectRatio="xMidYMid meet">
      <Defs><ClipPath id={id}><Path d={shape.d} /></ClipPath></Defs>
      <Path d={shape.d} fill={colors.sky} />
      {stateFlags[code] && <Image href={stateFlags[code]} width={shape.W} height={shape.H} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />}
    </Svg>
  </View>;
}
