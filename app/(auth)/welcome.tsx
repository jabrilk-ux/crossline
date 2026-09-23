import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '../../constants/theme';
import ActionButton from '../../components/ActionButton';
export default function WelcomeScreen() {
  const router = useRouter();
  const wide = useWindowDimensions().width >= 900;
  return <ScrollView style={{backgroundColor:colors.navy}} contentContainerStyle={{flexGrow:1,padding:wide?64:28}}>
    <View style={{width:'100%',maxWidth:1160,alignSelf:'center',flex:1}}>
      <Text style={styles.wordmark}>CROSSLINE</Text>
      <View style={{flex:1,flexDirection:wide?'row':'column-reverse',justifyContent:'center',gap:wide?90:24,paddingVertical:wide?44:24}}>
        <View style={{flex:1,justifyContent:'center',gap:24}}>
          <Text style={[styles.title,{fontSize:wide?58:38,lineHeight:wide?62:42}]}>Know what changes when you cross the line.</Text>
          <Text style={styles.body}>State-law references for the road ahead, personalized to your permits and firearm profile. Check available guidance and official sources before you travel.</Text>
          <View style={{maxWidth:400,width:'100%',gap:12}}><ActionButton title="Get Started" onPress={() => router.push('/(auth)/login?mode=signup')} /><Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')} style={{paddingVertical:16}}><Text style={{...typography.body,color:colors.muted,textAlign:'center'}}>Have an account? <Text style={{color:colors.white}}>Sign in</Text></Text></Pressable></View>
        </View>
        <View style={{flex:wide?1:undefined,backgroundColor:wide?colors.surface:'transparent',borderRadius:28,borderWidth:wide?1:0,borderColor:colors.border,padding:wide?28:0,justifyContent:'center',minHeight:wide?430:170}}>
          <View style={{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:22}}>
            <View><Text style={[styles.code,{color:'#2A4368'}]}>VA</Text><Text style={styles.caption}>ONE STATE</Text></View>
            <View style={{height:160,borderLeftWidth:2,borderColor:colors.skyLight,borderStyle:'dashed'}} />
            <View><Text style={styles.code}>MD</Text><Text style={styles.caption}>NEW RULES</Text></View>
          </View>
          {wide && <Text style={[styles.body,{fontSize:13,textAlign:'center',marginTop:24}]}>Your route crosses borders. Your preparation should too.</Text>}
        </View>
      </View>
      <Text style={{...typography.caption,color:colors.muted}}>FREE BETA · 14 East Coast reference states · Informational reference, not legal advice.</Text>
    </View>
  </ScrollView>;
}
const styles=StyleSheet.create({wordmark:{fontFamily:'Geist_700Bold',fontSize:15,letterSpacing:4.2,color:colors.skyLight},title:{fontFamily:typography.display.fontFamily,color:colors.white,letterSpacing:-1.3},body:{...typography.body,color:colors.muted,lineHeight:24},code:{fontFamily:typography.display.fontFamily,fontSize:76,letterSpacing:-4,color:colors.white},caption:{...typography.mono,fontSize:10,color:colors.muted,letterSpacing:1}});
