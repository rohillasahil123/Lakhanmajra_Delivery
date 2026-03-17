import { StyleSheet } from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const isSmallScreen = (width: number): boolean => width < 360;
export const isLargeScreen = (width: number): boolean => width >= 420;

export const getScreenPadding = (width: number): number => {
  if (width <= 360) return Math.round(scale(10));
  if (width <= 420) return Math.round(scale(14));
  if (width <= 768) return Math.round(scale(16));
  return Math.round(scale(20));
};

export const getResponsiveFont = (width: number, baseSize: number): number => {
  if (width <= 360) {
    return clamp(Math.round(moderateScale(baseSize, 0.38)), baseSize - 3, baseSize + 2);
  }

  if (width <= 420) {
    return clamp(Math.round(moderateScale(baseSize, 0.45)), baseSize - 2, baseSize + 3);
  }

  if (width <= 768) {
    return clamp(Math.round(moderateScale(baseSize, 0.52)), baseSize - 1, baseSize + 4);
  }

  // Tablet and large screens: keep from growing too much
  return clamp(Math.round(moderateScale(baseSize, 0.5)), baseSize - 1, baseSize + 4);
};

export const getResponsiveImageHeight = (
  width: number,
  ratio = 0.42,
): number => {
  const scaled = verticalScale(width * ratio);
  return clamp(
    Math.round(scaled),
    Math.round(verticalScale(140)),
    Math.round(verticalScale(220)),
  );
};

const nonScaledKeys = new Set([
  "flex",
  "flexGrow",
  "flexShrink",
  "opacity",
  "zIndex",
  "aspectRatio",
  "elevation",
  "scale",
]);

const verticalKeys = ["height", "top", "bottom"];
const textKeys = ["fontSize", "lineHeight", "letterSpacing"];
const moderateKeys = ["radius", "gap"];

const shouldMatch = (key: string, targets: string[]): boolean => {
  const normalized = key.toLowerCase();
  return targets.some((target) => normalized.includes(target));
};

const scaleNumericValue = (styleKey: string, value: number): number => {
  if (nonScaledKeys.has(styleKey)) {
    return value;
  }

  if (textKeys.includes(styleKey)) {
    return moderateScale(value, 0.55);
  }

  if (shouldMatch(styleKey, moderateKeys)) {
    return moderateScale(value, 0.45);
  }

  if (shouldMatch(styleKey, verticalKeys)) {
    return verticalScale(value);
  }

  return scale(value);
};

const mapStyleObject = (
  styleObject: Record<string, unknown>,
): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {};

  Object.entries(styleObject).forEach(([key, value]) => {
    if (typeof value === "number") {
      mapped[key] = scaleNumericValue(key, value);
      return;
    }

    if (Array.isArray(value)) {
      mapped[key] = value.map((entry) => {
        if (entry && typeof entry === "object") {
          return mapStyleObject(entry as Record<string, unknown>);
        }
        return entry;
      });
      return;
    }

    if (value && typeof value === "object") {
      mapped[key] = mapStyleObject(value as Record<string, unknown>);
      return;
    }

    mapped[key] = value;
  });

  return mapped;
};

export const createResponsiveStyles = <
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(
  styles: T,
): T => {
  const mapped: Record<string, unknown> = {};

  Object.entries(styles).forEach(([name, styleObject]) => {
    if (!styleObject || typeof styleObject !== "object") {
      mapped[name] = styleObject;
      return;
    }

    mapped[name] = mapStyleObject(styleObject as Record<string, unknown>);
  });

  return StyleSheet.create(mapped as T);
};

const clampScale = (value: number, base: number) => {
  const min = Math.round(base * 0.8);
  const max = Math.round(base * 1.25);
  return clamp(Math.round(value), min, max);
};

export const responsiveScale = (value: number) => clampScale(scale(value), value);
export const responsiveVerticalScale = (value: number) => clampScale(verticalScale(value), value);
export const responsiveModerateScale = (value: number, factor = 0.5) => {
  const scaled = moderateScale(value, factor);
  return clampScale(scaled, value);
};
