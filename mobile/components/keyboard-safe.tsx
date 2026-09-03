import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type KeyboardScrollApi = {
  setFocused: (node: View | null) => void;
};

const KeyboardScrollContext = createContext<KeyboardScrollApi | null>(null);

export function useKeepAboveKeyboard(targetRef: { current: View | null }) {
  const api = useContext(KeyboardScrollContext);

  return {
    onFocus: () => api?.setFocused(targetRef.current),
    onBlur: () => api?.setFocused(null),
  };
}

/** Remonte le champ focus au-dessus du clavier, y compris le dernier champ du formulaire. */
export function KeyboardSafe({
  children,
  contentContainerStyle,
  extraOffset = 80,
  refreshControl,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraOffset?: number;
  refreshControl?: ReactElement;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const offsetRef = useRef(0);
  const focusedRef = useRef<View | null>(null);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const ensureVisible = useCallback(() => {
    const node = focusedRef.current;
    const kb =
      keyboardHeightRef.current || Keyboard.metrics()?.height || 0;
    if (!node || kb <= 0) return;

    const run = () => {
      node.measureInWindow((_x, y, _w, height) => {
        viewportRef.current?.measureInWindow((_vx, vy, _vw, vh) => {
          const winH = Dimensions.get('window').height;
          const viewportBottom = Math.min(vy + vh, winH - kb);
          const delta = y + height + extraOffset - viewportBottom;
          if (delta > 4) {
            scrollRef.current?.scrollTo({
              y: Math.max(0, offsetRef.current + delta),
              animated: true,
            });
          }
        });
      });
    };

    requestAnimationFrame(() => {
      setTimeout(run, Platform.OS === 'ios' ? 40 : 80);
    });
  }, [extraOffset]);

  const setFocused = useCallback(
    (node: View | null) => {
      focusedRef.current = node;
      if (node) ensureVisible();
    },
    [ensureVisible],
  );

  useEffect(() => {
    const onShow = (event: { endCoordinates: { height: number } }) => {
      const height = event.endCoordinates.height;
      keyboardHeightRef.current = height;
      setKeyboardHeight(height);
    };
    const onHide = () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    };

    const willShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const didShow = Keyboard.addListener('keyboardDidShow', () => {
      ensureVisible();
    });
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );

    return () => {
      willShow.remove();
      didShow.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  useEffect(() => {
    if (keyboardHeight > 0) ensureVisible();
  }, [keyboardHeight, ensureVisible]);

  const value = useMemo(() => ({ setFocused }), [setFocused]);

  return (
    <KeyboardScrollContext.Provider value={value}>
      <View ref={viewportRef} collapsable={false} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={false}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            offsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          onContentSizeChange={() => {
            if (focusedRef.current && keyboardHeightRef.current > 0) {
              ensureVisible();
            }
          }}
          contentContainerStyle={[
            { paddingBottom: keyboardHeight + extraOffset + 24 },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    </KeyboardScrollContext.Provider>
  );
}
