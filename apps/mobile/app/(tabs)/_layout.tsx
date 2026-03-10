import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, tracking } from '../../lib/theme';

function PostTabIcon({ color }: { color: string }) {
  return (
    <View style={styles.postIconWrapper}>
      <Ionicons name="add" size={22} color="#000000" />
    </View>
  );
}

function PostTabLabel() {
  return <Text style={styles.postLabel}>POST</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#1F1F1F',
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 56,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#555555',
        tabBarLabelStyle: {
          fontSize: typography.sm - 2,
          fontWeight: '600',
          letterSpacing: tracking.widest,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'FEED',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <PostTabIcon color={color} />,
          tabBarLabel: () => <PostTabLabel />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  postIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
  },
  postLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#555555',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
