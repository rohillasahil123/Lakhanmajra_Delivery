import { StyleSheet } from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

// Advanced device detection
export const SCREEN_SIZES = {
  TINY: 320,    // Very small phones
  SMALL: 360,   // iPhone SE, small androids
  MEDIUM: 420,  // iPhone 12-13, standard androids
  LARGE: 600,   // iPad Mini, large phones
  TABLET: 800,  // iPad, tablets
  DESKTOP: 1200 // Desktop/web
} as const;

export const isSmallScreen = (width: number): boolean => width < 360;
export const isLargeScreen = (width: number): boolean => width >= 420;
export const isTabletScreen = (width: number): boolean => width >= 600;
export const isDesktop = (width: number): boolean => width >= 1200;
export const getDeviceType = (width: number): 'tiny' | 'small' | 'medium' | 'large' | 'tablet' | 'desktop' => {
  if (width >= SCREEN_SIZES.DESKTOP) return 'desktop';
  if (width >= SCREEN_SIZES.TABLET) return 'tablet';
  if (width >= SCREEN_SIZES.LARGE) return 'large';
  if (width >= SCREEN_SIZES.MEDIUM) return 'medium';
  if (width >= SCREEN_SIZES.SMALL) return 'small';
  return 'tiny';
};

export const getScreenPadding = (width: number): number => {
  if (width <= SCREEN_SIZES.SMALL) return Math.round(scale(10));
  if (width <= SCREEN_SIZES.MEDIUM) return Math.round(scale(14));
  if (width <= SCREEN_SIZES.LARGE) return Math.round(scale(16));
  if (width <= SCREEN_SIZES.TABLET) return Math.round(scale(20));
  return Math.round(scale(24));
};

export const getResponsiveFont = (width: number, baseSize: number): number => {
  if (width <= SCREEN_SIZES.SMALL) {
    return clamp(Math.round(moderateScale(baseSize, 0.38)), baseSize - 3, baseSize + 2);
  }

  if (width <= SCREEN_SIZES.MEDIUM) {
    return clamp(Math.round(moderateScale(baseSize, 0.45)), baseSize - 2, baseSize + 3);
  }

  if (width <= SCREEN_SIZES.LARGE) {
    return clamp(Math.round(moderateScale(baseSize, 0.52)), baseSize - 1, baseSize + 4);
  }

  if (width <= SCREEN_SIZES.TABLET) {
    return clamp(Math.round(moderateScale(baseSize, 0.55)), baseSize - 1, baseSize + 6);
  }

  // Desktop: keep proportional
  return clamp(Math.round(moderateScale(baseSize, 0.6)), baseSize, baseSize + 8);
};

// Additional responsive helpers
export const getResponsiveSpacing = (width: number, baseValue: number): number => {
  if (width <= SCREEN_SIZES.SMALL) return Math.round(baseValue * 0.8);
  if (width <= SCREEN_SIZES.MEDIUM) return Math.round(baseValue * 0.9);
  if (width <= SCREEN_SIZES.LARGE) return baseValue;
  if (width <= SCREEN_SIZES.TABLET) return Math.round(baseValue * 1.1);
  return Math.round(baseValue * 1.2);
};

export const getResponsiveBorderRadius = (width: number, baseRadius: number): number => {
  if (width <= SCREEN_SIZES.SMALL) return Math.round(baseRadius * 0.85);
  if (width <= SCREEN_SIZES.MEDIUM) return baseRadius;
  if (width <= SCREEN_SIZES.LARGE) return Math.round(baseRadius * 1.05);
  return Math.round(baseRadius * 1.15);
};

export const getResponsiveLineHeight = (width: number, baseLineHeight: number): number => {
  if (width <= SCREEN_SIZES.SMALL) return baseLineHeight;
  if (width <= SCREEN_SIZES.MEDIUM) return baseLineHeight * 1.1;
  return baseLineHeight * 1.15;
};

export const getResponsiveGap = (width: number, baseGap: number): number => {
  if (width <= SCREEN_SIZES.SMALL) return Math.round(baseGap * 0.9);
  if (width <= SCREEN_SIZES.MEDIUM) return baseGap;
  if (width <= SCREEN_SIZES.LARGE) return Math.round(baseGap * 1.05);
  if (width <= SCREEN_SIZES.TABLET) return Math.round(baseGap * 1.2);
  return Math.round(baseGap * 1.35);
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
