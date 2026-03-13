import { View, Text } from "react-native";
import { createResponsiveStyles } from "@/utils/responsive";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home Screen Working 🚀</Text>
    </View>
  );
}

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
});
