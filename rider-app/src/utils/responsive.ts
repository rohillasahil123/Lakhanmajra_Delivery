import { StyleSheet } from "react-native";
import {
  moderateScale as sizeMattersModerateScale,
  scale as sizeMattersScale,
  verticalScale as sizeMattersVerticalScale,
} from "react-native-size-matters";

export const horizontalScale = (size: number): number => sizeMattersScale(size);
export const verticalScale = (size: number): number =>
  sizeMattersVerticalScale(size);
export const moderateScale = (size: number, factor = 0.5): number => {
  return sizeMattersModerateScale(size, factor);
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

  return horizontalScale(value);
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

export const iconSize = (size: number): number => moderateScale(size, 0.5);
