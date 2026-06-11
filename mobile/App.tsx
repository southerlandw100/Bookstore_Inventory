import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./src/types";
import ScannerScreen from './src/screens/ScannerScreen'
import BookEntryScreen from "./src/screens/BookEntryScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="BookEntry" component={BookEntryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}