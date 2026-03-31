import { Text, View } from 'react-native';

export default function SetupsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-xl font-bold text-black dark:text-white">Setups</Text>
      <View className="my-8 h-[1px] w-4/5 bg-gray-200 dark:bg-gray-800" />
      <Text className="text-gray-500">Manage devices, groups, and ports</Text>
    </View>
  );
}
