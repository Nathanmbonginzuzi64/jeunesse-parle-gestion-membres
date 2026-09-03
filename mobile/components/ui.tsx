import { JP } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Title({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <Text style={[styles.title, center && { textAlign: 'center' }]}>{children}</Text>;
}

export function Subtitle({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <Text style={[styles.subtitle, center && { textAlign: 'center' }]}>{children}</Text>;
}

export function Field(
  props: TextInputProps & {
    label: string;
    error?: string;
    passwordToggle?: boolean;
    valid?: boolean;
  },
) {
  const {
    label,
    style,
    error,
    passwordToggle,
    valid,
    secureTextEntry,
    autoComplete,
    textContentType,
    ...rest
  } = props;
  const [hidden, setHidden] = useState(true);
  const secure = passwordToggle ? hidden : secureTextEntry;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          error ? styles.inputWrapError : null,
          !error && valid ? styles.inputWrapValid : null,
        ]}
      >
        <TextInput
          placeholderTextColor={JP.muted}
          style={[styles.input, passwordToggle && styles.inputWithIcon, style]}
          secureTextEntry={secure}
          autoComplete={passwordToggle ? 'password' : autoComplete}
          textContentType={passwordToggle ? 'password' : textContentType}
          {...rest}
        />
        {passwordToggle ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={8}
            style={styles.eye}
            accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={valid && !error ? JP.success : JP.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function BigButton({
  label,
  onPress,
  tone = 'brand',
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'brand' | 'success' | 'danger' | 'neutral';
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg =
    tone === 'success'
      ? JP.success
      : tone === 'danger'
        ? JP.danger
        : tone === 'neutral'
          ? JP.border
          : JP.brand;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.bigButton,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.7 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={JP.white} />
      ) : (
        <Text style={[styles.bigButtonText, tone === 'neutral' && { color: JP.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[styles.textLink, pressed && { opacity: 0.6 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'danger' | 'neutral' }) {
  const colors =
    tone === 'success'
      ? { bg: '#ECFDF3', text: JP.success }
      : tone === 'danger'
        ? { bg: '#FEF3F2', text: JP.danger }
        : { bg: '#F1F5F9', text: JP.muted };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: JP.white,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: JP.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: JP.muted,
    lineHeight: 20,
  },
  field: { marginBottom: 14 },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: JP.text,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.card,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapError: {
    borderColor: JP.danger,
  },
  inputWrapValid: {
    borderColor: JP.success,
    backgroundColor: '#F0FDF4',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: JP.text,
  },
  inputWithIcon: {
    paddingRight: 8,
  },
  eye: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: JP.danger,
  },
  bigButton: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bigButtonText: {
    color: JP.white,
    fontSize: 16,
    fontWeight: '700',
  },
  textLink: {
    color: JP.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: JP.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
