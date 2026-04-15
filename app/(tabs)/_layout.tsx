import { Tabs } from 'expo-router';
import React from 'react';

// composants custom pour améliorer UX (vibration + icones)
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

// thème + gestion dark/light
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  // récupère le thème actuel du device
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // couleur active dépend du thème
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,

        // on enlève le header par défaut
        headerShown: false,

        // bouton custom avec vibration
        tabBarButton: HapticTab,
      }}
    >
      {/* écran principal */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* écran secondaire (tests / navigation) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}