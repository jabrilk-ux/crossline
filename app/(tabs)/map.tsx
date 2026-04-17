import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Pressable, Platform, ActivityIndicator,
} from 'react-native';
import MapView, { Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { colors, statusColors, typography } from '../../constants/theme';
import { useLocationStore } from '../../store/locationStore';
import { useUserStore } from '../../store/userStore';
import { STATES } from '../../constants/states';
import { getCarryStatusForUser } from '../../services/laws';
import stateBorders from '../../data/state-borders.geojson';
import type { CarryStatus } from '../../services/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StateCarryMap {
  [stateCode: string]: CarryStatus;
}

interface SelectedState {
  code: string;
  name: string;
  status: CarryStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONUS_REGION: Region = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 30,
  longitudeDelta: 40,
};

const STATUS_FILL: Record<CarryStatus, string> = {
  allowed:    colors.success + '59',  // 35% opacity
  restricted: colors.warning + '59',
  prohibited: colors.danger  + '59',
  unknown:    '#718096' + '40',       // 25% opacity
};

const STATUS_STROKE: Record<CarryStatus, string> = {
  allowed:    colors.success + 'AA',
  restricted: colors.warning + 'AA',
  prohibited: colors.danger  + 'AA',
  unknown:    colors.border,
};

// ─── GeoJSON → polygon coordinate conversion ─────────────────────────────────

type LatLng = { latitude: number; longitude: number };

function ringToLatLng(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

// Pre-process GeoJSON into flat polygon list once at module load
interface StatePolygon {
  stateCode: string;
  rings: LatLng[][];  // array of rings (outer + holes, each a separate Polygon)
}

const STATE_POLYGONS: StatePolygon[] = (() => {
  const result: StatePolygon[] = [];
  const collection = stateBorders as GeoJSON.FeatureCollection;

  for (const feature of collection.features) {
    const code = (feature.properties as { STUSPS: string }).STUSPS;
    if (!code) continue;

    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      result.push({ stateCode: code, rings: geom.coordinates.map(ringToLatLng) });
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        result.push({ stateCode: code, rings: poly.map(ringToLatLng) });
      }
    }
  }
  return result;
})();

// ─── State info sheet ─────────────────────────────────────────────────────────

function StateSheet({
  state,
  onClose,
}: {
  state: SelectedState | null;
  onClose: () => void;
}) {
  const router = useRouter();

  const CARRY_SUMMARY: Record<CarryStatus, string> = {
    allowed:    'Your permit is honored here. Carry is permitted.',
    restricted: 'Your permit is honored but restrictions apply.',
    prohibited: 'Your permit is not recognized in this state.',
    unknown:    'Carry status is pending verification.',
  };

  if (!state) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.container} onPress={() => {}}>
          <View style={sheet.handle} />

          <Text style={sheet.stateName}>{state.name}</Text>

          {/* Status badge */}
          <View style={[sheet.badge, { borderColor: statusColors[state.status] + '88', backgroundColor: statusColors[state.status] + '1A' }]}>
            <View style={[sheet.badgeDot, { backgroundColor: statusColors[state.status] }]} />
            <Text style={[sheet.badgeText, { color: statusColors[state.status] }]}>
              {state.status === 'allowed'    ? 'Carry Permitted'       :
               state.status === 'restricted' ? 'Restrictions Apply'    :
               state.status === 'prohibited' ? 'Carry Not Permitted'   :
                                               'Status Unknown'}
            </Text>
          </View>

          <Text style={sheet.summary}>{CARRY_SUMMARY[state.status]}</Text>

          <TouchableOpacity
            style={sheet.cta}
            onPress={() => { onClose(); router.push(`/(tabs)/laws?state=${state.code}`); }}
            activeOpacity={0.85}
          >
            <Text style={sheet.ctaText}>View Full Laws →</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function MapLegend() {
  const items: { status: CarryStatus; label: string }[] = [
    { status: 'allowed',    label: 'Permitted' },
    { status: 'restricted', label: 'Restrictions' },
    { status: 'prohibited', label: 'Not Permitted' },
    { status: 'unknown',    label: 'No Data' },
  ];
  return (
    <View style={legend.container}>
      {items.map(({ status, label }) => (
        <View key={status} style={legend.item}>
          <View style={[legend.dot, { backgroundColor: statusColors[status] }]} />
          <Text style={legend.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Map Screen ───────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { permits, firearmsProfile } = useUserStore();
  const { currentState } = useLocationStore();

  const [carryMap, setCarryMap] = useState<StateCarryMap>({});
  const [loadingMap, setLoadingMap] = useState(true);
  const [selectedState, setSelectedState] = useState<SelectedState | null>(null);

  // Stable key for memoisation — rebuild only when permit stack changes
  const permitKey = useMemo(
    () => permits.map(p => `${p.stateCode}:${p.permitType}`).sort().join('|'),
    [permits]
  );

  // Load carry status for all states — runs once per permit change
  useEffect(() => {
    let cancelled = false;
    setLoadingMap(true);

    async function loadAll() {
      const entries = await Promise.all(
        STATES.map(async s => {
          const status = await getCarryStatusForUser(s.code, permits, firearmsProfile);
          return [s.code, status] as [string, CarryStatus];
        })
      );
      if (!cancelled) {
        setCarryMap(Object.fromEntries(entries));
        setLoadingMap(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [permitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoised polygon props — only recompute when carryMap changes
  const polygons = useMemo(() => {
    return STATE_POLYGONS.map((sp, idx) => {
      const status = carryMap[sp.stateCode] ?? 'unknown';
      return {
        key: `${sp.stateCode}-${idx}`,
        stateCode: sp.stateCode,
        rings: sp.rings,
        fillColor: STATUS_FILL[status],
        strokeColor: STATUS_STROKE[status],
        status,
      };
    });
  }, [carryMap]);

  const handlePolygonPress = useCallback((stateCode: string, status: CarryStatus) => {
    const info = STATES.find(s => s.code === stateCode);
    if (!info) return;
    setSelectedState({ code: stateCode, name: info.name, status });
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={CONUS_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        mapType="standard"
      >
        {!loadingMap && polygons.map(p => (
          // Each ring rendered as a separate Polygon so holes work correctly
          p.rings.map((ring, rIdx) => (
            <Polygon
              key={`${p.key}-r${rIdx}`}
              coordinates={ring}
              fillColor={p.fillColor}
              strokeColor={p.strokeColor}
              strokeWidth={1}
              tappable
              onPress={() => handlePolygonPress(p.stateCode, p.status)}
            />
          ))
        ))}
      </MapView>

      {/* Loading overlay */}
      {loadingMap && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.sky} size="large" />
          <Text style={styles.loadingText}>Loading permit map…</Text>
        </View>
      )}

      {/* Current state pill */}
      {currentState && (
        <View style={styles.currentStatePill}>
          <Text style={styles.currentStatePillText}>
            You are in {STATES.find(s => s.code === currentState)?.name ?? currentState}
          </Text>
        </View>
      )}

      {/* Legend */}
      <MapLegend />

      {/* State info sheet */}
      {selectedState && (
        <StateSheet
          state={selectedState}
          onClose={() => setSelectedState(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.navy + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
  currentStatePill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: colors.navy + 'EE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentStatePillText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
});

const legend = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.navy + 'F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.white,
  },
});

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000077',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.navy,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  stateName: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.white,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  summary: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    textAlign: 'center',
    lineHeight: 22,
  },
  cta: {
    backgroundColor: colors.sky,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },
});
