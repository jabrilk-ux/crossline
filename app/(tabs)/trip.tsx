import Button from '../../components/ActionButton';
import TripStatePicker from '../../components/TripStatePicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { getLegalReference } from '../../services/legalReferences';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View, Linking, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTripBriefing, getStatesAlongRoute, geocodeAddress, drivingRoutesConfigured, type GeocodedLocation, type TripState } from '../../services/trip';
import { useUserStore } from '../../store/userStore';
import { STATES, getStateName } from '../../constants/states';
import { colors, typography } from '../../constants/theme';
interface SavedTrip { savedAt: string; states: TripState[]; mode: 'manual' | 'driving'; routeWarning?: string }
function Address({ label, onSelect }: { label: string; onSelect: (v: GeocodedLocation | null) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedLocation[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <View style={{ gap: 8 }}><TextInput accessibilityLabel={label} value={query} onChangeText={v => { setQuery(v); onSelect(null); setResults([]); }} placeholder={label} placeholderTextColor={colors.silver} style={{ color: colors.white, backgroundColor: colors.surface, borderRadius:16, borderWidth:1,borderColor:colors.border,padding: 16 }} />
    <Button title={`Find ${label.toLowerCase()}`} disabled={busy || query.trim().length < 3} onPress={() => { setBusy(true); setMessage(''); void geocodeAddress(query).then(r => { setResults(r); if (!r.length) setMessage('No results, or search is unavailable. Retry or use manual planning.'); }).catch(() => setMessage('Address search failed. Retry.')).finally(() => setBusy(false)); }} />
    {results.map((r,i) => <Button key={i} title={r.label} onPress={() => { setQuery(r.label); setResults([]); onSelect(r); }} />)}
    {message ? <Text style={{ color: colors.silver }}>{message}</Text> : null}
  </View>;
}
export default function Trip() {
  const router = useRouter();
  const { userId, permits, firearmsProfile } = useUserStore();
  const [mode, setMode] = useState<'manual' | 'driving'>('manual');
  const [codes, setCodes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [codeEntry, setCodeEntry] = useState(false);
  const routeCodes = codes.toUpperCase().split(/[\s,>]+/).filter(Boolean);
  function updateRoute(states: string[]) { setCodes(states.join(', ')); setTrip(null); setMessage(''); setOffline(false); }
  function moveStop(index: number, direction: number) { const list = [...routeCodes]; [list[index], list[index + direction]] = [list[index + direction], list[index]]; updateRoute(list); }
  const [origin, setOrigin] = useState<GeocodedLocation | null>(null);
  const [destination, setDestination] = useState<GeocodedLocation | null>(null);
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [saved, setSaved] = useState<SavedTrip | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const key = `crossline:trip:${userId}:latest`;
  useEffect(() => { let active=true; void AsyncStorage.getItem(key).then(raw => { if(active) setSaved(raw ? JSON.parse(raw) : null); }).catch(() => setMessage('Saved trip could not be loaded.')); return ()=>{active=false;}; }, [key]);
  async function plan() {
    setBusy(true); setMessage(''); setTrip(null); setOffline(false);
    try {
      let states: string[];
      let routeWarning: string | undefined;
      if (mode === 'manual') {
        states=codes.toUpperCase().split(/[\s,>]+/).filter(Boolean);
        if (!states.length || states.length > 30 || states.some(c => !STATES.some(s => s.code === c))) throw new Error('Enter up to 30 valid state codes, in travel order, such as VA, MD, PA.');
      } else {
        if (!origin || !destination) throw new Error('Select both addresses from search results.');
        const route = await getStatesAlongRoute(origin,destination);
        states = route.states;
        if (route.hasUnmappedSections) routeWarning = 'Some route sections are outside the bundled U.S. state boundaries. This list may be incomplete; verify every jurisdiction on the actual route.';
      }
      const briefing=await buildTripBriefing(states,permits,firearmsProfile);
      setTrip({ savedAt: new Date().toISOString(), states: briefing, mode, routeWarning });
    } catch(e) { setMessage(e instanceof Error ? e.message : 'Could not plan this trip. Check your connection.'); }
    finally { setBusy(false); }
  }
  return <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ padding: 24, paddingTop: 32, gap: 18, width:'100%',maxWidth:1000,alignSelf:'center' }}>
    <Text style={{ ...typography.h1, color: colors.white }}>Trip planner</Text>
    <Text style={{ ...typography.body, color: colors.muted, lineHeight: 24 }}>Build your route, state by state. We’ll gather the available guidance into one brief you can save for the road.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Button title="Choose states" disabled={busy} onPress={() => { setMode('manual'); setPickerOpen(true); }} />{drivingRoutesConfigured && <Button variant="secondary" title="Driving route" disabled={busy} onPress={() => { setMode('driving'); setTrip(null); }} />}</View>
    {mode === 'manual' ? <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 20, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ ...typography.h2, color: colors.white }}>Your route</Text><Text style={{ ...typography.caption, color: colors.muted }}>{routeCodes.length} {routeCodes.length === 1 ? 'stop' : 'stops'}</Text></View>
      {!routeCodes.length && <Pressable accessibilityRole="button" accessibilityLabel="Add your starting state" onPress={() => setPickerOpen(true)} style={({ pressed }) => ({ padding: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sky, borderRadius: 16, alignItems: 'center', gap: 12, backgroundColor: pressed ? colors.surfaceRaised : 'transparent' })}><Ionicons name="add-circle-outline" size={30} color={colors.skyLight} /><Text style={{ ...typography.body, color: colors.skyLight }}>Add your starting state</Text><Text style={{ ...typography.caption, color: colors.muted }}>Then add the states you’ll travel through.</Text></Pressable>}
      {routeCodes.map((code, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Text style={{ ...typography.body, color: colors.skyLight }}>{i + 1}</Text></View>
        <View style={{ flex: 1 }}><Text style={{ ...typography.body, color: colors.white }}>{getStateName(code)}</Text><Text style={{ ...typography.caption, color: colors.muted }}>{i === 0 ? 'Start' : i === routeCodes.length - 1 ? 'Destination' : 'Along the way'} · {code}</Text></View>
        {[{ icon: 'arrow-up' as const, step: -1, label: 'earlier', disabled: i === 0 }, { icon: 'arrow-down' as const, step: 1, label: 'later', disabled: i === routeCodes.length - 1 }].map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={`Move stop ${i + 1} ${action.label}`} disabled={action.disabled || busy} onPress={() => moveStop(i, action.step)} style={{ padding: 10, opacity: action.disabled ? 0.2 : 1 }}><Ionicons name={action.icon} size={18} color={colors.silver} /></Pressable>)}
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove stop ${i + 1}`} disabled={busy} onPress={() => updateRoute(routeCodes.filter((_, index) => index !== i))} style={{ padding: 10 }}><Ionicons name="close" size={20} color={colors.muted} /></Pressable>
      </View>)}
      {!!routeCodes.length && <Button variant="secondary" title="Add another state" disabled={busy || routeCodes.length >= 30} onPress={() => setPickerOpen(true)} />}
      <Text style={{ ...typography.caption, color: colors.muted, lineHeight: 20 }}>Include every state you enter, in travel order. This creates a state brief; it does not calculate driving directions.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: codeEntry }} onPress={() => setCodeEntry(v => !v)} style={{ paddingVertical: 8 }}><Text style={{ ...typography.caption, color: colors.skyLight }}>{codeEntry ? 'Hide state codes' : 'Enter state codes instead'}</Text></Pressable>
      {codeEntry && <TextInput accessibilityLabel="States in travel order" value={codes} editable={!busy} onChangeText={v => { setCodes(v); setTrip(null); setMessage(''); }} placeholder="VA, MD, PA" placeholderTextColor={colors.muted} autoCapitalize="characters" style={{ ...typography.body, color: colors.white, backgroundColor: colors.navy, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 }} />}
    </View> : <><Text style={{ color: colors.silver }}>Searches share addresses with OpenCage. Planning shares origin and destination coordinates with the configured directions provider.</Text><Address label="Origin" onSelect={setOrigin} /><Address label="Destination" onSelect={setDestination} /></>}
    <Button title={busy ? 'Preparing…' : 'Prepare trip brief'} disabled={busy || (mode === 'manual' && !routeCodes.length)} onPress={plan} />
    <TripStatePicker visible={pickerOpen} value={routeCodes} onClose={() => setPickerOpen(false)} onDone={states => { updateRoute(states); setPickerOpen(false); }} />
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.warning }}>{message}</Text> : null}
    {saved && <><Button variant="secondary" title={`Open saved brief (${new Date(saved.savedAt).toLocaleDateString()})`} disabled={busy} onPress={() => { setTrip(saved); setOffline(true); }} /><Button variant="row" title="Delete saved brief" disabled={busy} onPress={() => { void AsyncStorage.removeItem(key).then(() => { setSaved(null); if(offline) setTrip(null); }).catch(() => setMessage('Could not delete saved brief.')); }} /></>}
    {trip && <>
      <Text style={{ color: colors.sky }}>{trip.mode === 'manual' ? 'Manually selected states' : 'Driving-route states'} · {new Date(trip.savedAt).toLocaleString()}</Text>
      {trip.routeWarning && <Text style={{ color: colors.warning }}>{trip.routeWarning}</Text>}
      {offline && <Text style={{ color: colors.warning }}>Saved copy. Rules or your profile may have changed. Carry status is undetermined until you prepare a fresh brief online.</Text>}
      {!offline && <Button title="Save brief on this device" onPress={() => { void AsyncStorage.setItem(key,JSON.stringify(trip)).then(() => { setSaved(trip); setMessage('Trip saved on this device.'); }).catch(() => setMessage('Could not save trip.')); }} />}
      {trip.states.map((state,i) => <View key={`${i}-${state.stateCode}`} style={{ backgroundColor: colors.steel, padding: 18, borderRadius: 20, gap: 10 }}><Text style={{ color: colors.white, fontSize: 22 }}>{i+1}. {state.stateName}</Text><Text style={{ color: colors.warning }}>{offline || state.carryStatus === 'unknown' ? 'Unable to determine carry status' : `Reviewed guidance: ${state.carryStatus}. Check all conditions.`}</Text>{!state.keyLaws.length && <Text style={{ color: colors.silver }}>No current reviewed law summaries are available for this state.</Text>}{!getLegalReference(state.stateCode) && <Text style={{ color: colors.warning }}>Outside the 14-state beta reference coverage. Verify this jurisdiction separately.</Text>}<Button variant="secondary" title={`State references: ${state.stateName}`} onPress={() => router.push({ pathname: '/references', params: { state: state.stateCode } })} />{state.keyLaws.map(law => <View key={law.id} style={{ gap: 5 }}><Text style={{ color: colors.white }}>{law.plain_english}</Text><Text style={{ color: colors.silver }}>Reviewed: {law.last_verified ? new Date(law.last_verified).toLocaleDateString() : 'Not verified'}</Text>{law.statute_url?.startsWith('https://') && <Button title="Official source" onPress={() => { void Linking.openURL(law.statute_url!).catch(() => Alert.alert('Could not open source')); }} />}</View>)}</View>)}
    </>}
  </ScrollView>;
}
