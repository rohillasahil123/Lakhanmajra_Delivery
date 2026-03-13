import Animated from "react-native-reanimated";
import {
  responsiveModerateScale,
  responsiveVerticalScale,
} from "@/utils/responsive";

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: responsiveModerateScale(28),
        lineHeight: responsiveModerateScale(32),
        marginTop: -responsiveVerticalScale(6),
        animationName: {
          "50%": { transform: [{ rotate: "25deg" }] },
        },
        animationIterationCount: 4,
        animationDuration: "300ms",
      }}
    >
      👋
    </Animated.Text>
  );
}
