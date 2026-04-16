import { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_WIDTH = 700;

type Props = {
  children: ReactNode;
  bg?: string;
  noBottomInset?: boolean;
};

export default function ScreenWrapper({ children, bg = '#0B0F1A', noBottomInset = false }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outer, { backgroundColor: bg }]}>
      <View style={{ height: insets.top, backgroundColor: bg }} />
      <View style={[styles.inner, { paddingBottom: noBottomInset ? 0 : insets.bottom }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? MAX_WIDTH : undefined,
    alignSelf: 'center',
  },
});
