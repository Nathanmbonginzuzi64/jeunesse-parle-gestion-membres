import { Linking, Platform } from 'react-native';

/** Ouvre la navigation native vers une destination GPS. */
export async function openNativeDirections(lat: number, lng: number, label?: string) {
  const encodedLabel = encodeURIComponent(label || 'Activité Jeunesse Parle');
  const urls =
    Platform.OS === 'ios'
      ? [
          `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
          `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
        ]
      : [
          `google.navigation:q=${lat},${lng}`,
          `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`,
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
        ];

  for (const url of urls) {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      /* try next */
    }
  }

  await Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
  );
}
