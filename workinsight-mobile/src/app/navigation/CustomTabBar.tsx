import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const icons: Record<string, string> = {
  Home: '⌂',
  Upload: '⇪',
  Results: '≣',
  Matches: '⋯',
  Profile: '◎'
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const rawLabel =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;
          const label = typeof rawLabel === 'string' ? rawLabel : route.name;

          const isFocused = state.index === index;
          const isHome = route.name === 'Home';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isHome && styles.homeTab]}
            >
              <View style={[styles.iconPill, isHome && styles.homeIconPill]}>
                <Text style={[styles.icon, isFocused && styles.iconActive, isHome && styles.homeIcon]}>
                  {icons[route.name] ?? '·'}
                </Text>
              </View>
              {!isHome && <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent'
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(4,6,12,0.92)',
    borderTopWidth: 0,
    paddingBottom: 12,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    flex: 1
  },
  icon: {
    fontSize: 18,
    opacity: 0.65,
    color: '#f5f5f5'
  },
  iconActive: {
    opacity: 1
  },
  label: {
    fontSize: 12,
    color: 'rgba(226,232,240,0.6)'
  },
  labelActive: {
    color: '#7ab5ff',
    fontWeight: '600'
  },
  iconPill: {
    height: 38,
    width: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  homeTab: {
    marginTop: -18,
    flex: 1.2
  },
  homeIconPill: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  homeIcon: {
    fontSize: 24
  }
});
