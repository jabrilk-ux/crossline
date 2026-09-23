import { Image, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';
import { stateFlags } from '../constants/stateFlags';

// D.C. uses three red stars above two bars: https://os.dc.gov/node/117532
export default function StateFlag({ code }: { code: string }) {
  return <View style={{ width: 48, height: 34, flexShrink: 0, justifyContent: 'center', alignItems: 'center' }}>
    {code === 'DC' ? <Svg width={48} height={24} viewBox="0 0 60 30" accessible={false}>
      <Rect width={60} height={30} fill="#fff" />
      <Rect y={9} width={60} height={6} fill="#e81b23" />
      <Rect y={18} width={60} height={6} fill="#e81b23" />
      {[10, 30, 50].map(x => <Polygon key={x} points="0,-3.5 0.79,-1.08 3.33,-1.08 1.27,0.41 2.06,2.83 0,1.34 -2.06,2.83 -1.27,0.41 -3.33,-1.08 -0.79,-1.08" transform={`translate(${x} 4.5)`} fill="#e81b23" />)}
    </Svg> : <Image source={stateFlags[code]} resizeMode="contain" accessible={false} style={{ width: 48, height: 34 }} />}
  </View>;
}
