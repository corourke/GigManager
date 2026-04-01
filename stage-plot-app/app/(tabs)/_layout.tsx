import React from 'react';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { Layers, GitBranch, Table, Info } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable headers as we use custom ones
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Setups',
          tabBarIcon: ({ color }) => <Layers size={24} color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Info
                    size={24}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="diagram"
        options={{
          title: 'Diagram',
          tabBarIcon: ({ color }) => <GitBranch size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patch"
        options={{
          title: 'Patch',
          tabBarIcon: ({ color }) => <Table size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
