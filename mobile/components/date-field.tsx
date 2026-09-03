import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JP } from '@/constants/theme';

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplay(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) return '';
  return parsed.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DateField({
  label,
  value,
  onChange,
  error,
  maximumDate,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => parseIsoDate(value) ?? new Date(new Date().getFullYear() - 20, 0, 1),
    [value],
  );

  function onPick(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed') return;
    }
    if (date) onChange(toIsoDate(date));
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.input, error ? styles.inputError : null]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="calendar-outline" size={20} color={JP.brand} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : 'Choisir une date dans le calendrier'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={JP.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display="calendar"
          onChange={onPick}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          locale="fr-FR"
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
          <View style={styles.iosRoot}>
            <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHead}>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <Text style={styles.cancel}>Annuler</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <Text style={styles.done}>OK</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selected}
                mode="date"
                display="inline"
                onChange={onPick}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                locale="fr_FR"
                themeVariant="light"
                accentColor={JP.brand}
                style={styles.iosCalendar}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: JP.text,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputError: { borderColor: JP.danger },
  value: { flex: 1, fontSize: 15, color: JP.text, textTransform: 'capitalize' },
  placeholder: { color: JP.muted, textTransform: 'none', fontSize: 15 },
  error: { marginTop: 6, fontSize: 12, color: JP.danger },
  iosRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  sheet: {
    backgroundColor: JP.white,
    paddingHorizontal: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: JP.border,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: JP.text },
  cancel: { color: JP.muted, fontWeight: '600', fontSize: 16 },
  done: { color: JP.brand, fontWeight: '700', fontSize: 16 },
  iosCalendar: {
    alignSelf: 'center',
    height: 360,
  },
});
