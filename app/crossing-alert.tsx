import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, statusColors } from '../constants/theme';
import { STATES } from '../constants/states';
import { useUserStore } from '../store/userStore';
import { getCarryGuidanceForUser } from '../services/laws';
import type { CarryStatus } from '../services/notifications';
import StateSilhouette from '../components/StateSilhouette';
import ActionButton from '../components/ActionButton';
export default function CrossingAlert() {
  const { state } = useLocalSearchParams<{state:string}>();
  const info = STATES.find(s => s.code === state);
  const router=useRouter();
  const {permits,firearmsProfile}=useUserStore();
  const [status,setStatus]=useState<CarryStatus>('unknown');
  useEffect(() => { let active=true; setStatus('unknown'); if(info) void getCarryGuidanceForUser(info.code,permits,firearmsProfile).then(r=>{if(active)setStatus(r.status);}).catch(()=>{}); return()=>{active=false;}; },[info?.code,permits,firearmsProfile]);
  const tint=statusColors[status];
  return <ScrollView style={{flex:1,backgroundColor:colors.navy}} contentContainerStyle={{padding:28,paddingTop:48,gap:24,width:'100%',maxWidth:680,alignSelf:'center'}}>
    <Text style={{...typography.mono,color:tint,letterSpacing:2}}>STATE CROSSING</Text>
    <Text style={{...typography.display,color:colors.white,fontSize:48}}>{info?.name ?? 'State unavailable'}</Text>
    {info && <StateSilhouette code={info.code} height={180}/>}
    <View style={{padding:20,gap:10,borderRadius:20,backgroundColor:tint+'18',borderWidth:1,borderColor:tint+'55'}}>
      <Text style={{...typography.h2,color:tint,fontSize:22}}>{status==='unknown'?'Unable to determine carry status':status==='allowed'?'Reviewed guidance available':status==='restricted'?'Restrictions apply':'Reviewed prohibition'}</Text>
      <Text style={{...typography.body,color:colors.textSecondary,lineHeight:24}}>State rules may differ from the state you left. Review the conditions and official sources for your saved profile.</Text>
    </View>
    <Text style={{...typography.mono,color:colors.muted}}>NEXT STEPS</Text>
    {['When safely stopped, review the state’s full guidance.','Check permit recognition, transport and storage conditions.','Verify official sources before relying on a summary.'].map((text,i)=><View key={text} style={{flexDirection:'row',gap:16}}><Text style={{...typography.mono,color:colors.skyLight}}>{String(i+1).padStart(2,'0')}</Text><Text style={{...typography.body,color:colors.textSecondary,lineHeight:23,flex:1}}>{text}</Text></View>)}
    {info && <ActionButton title={`See all ${info.name} laws`} onPress={()=>router.replace(`/(tabs)/laws?state=${info.code}`)}/>}
    <ActionButton variant="row" title="Back to Home" onPress={()=>router.replace('/(tabs)/home')}/>
    <Text style={{...typography.caption,color:colors.muted,lineHeight:18}}>Informational reference, not legal advice. An unknown status does not mean carrying is permitted.</Text>
  </ScrollView>;
}
