import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./src/types";
import { CartProvider } from "./src/context/CartContext";
import HomeScreen from './src/screens/HomeScreen'
import ScannerScreen from './src/screens/ScannerScreen'
import BookEntryScreen from "./src/screens/BookEntryScreen";
import SellScannerScreen from "./src/screens/SellScannerScreen";
import CartReviewScreen from "./src/screens/CartReviewScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="BookEntry" component={BookEntryScreen} />
          <Stack.Screen name="SellScanner" component={SellScannerScreen} />
          <Stack.Screen name="CartReview" component={CartReviewScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  )
}