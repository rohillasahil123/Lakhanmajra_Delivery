export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const isSmallScreen = (width: number): boolean => width < 360;
export const isLargeScreen = (width: number): boolean => width >= 420;

export const getScreenPadding = (width: number): number => {
  if (isSmallScreen(width)) return 12;
  if (isLargeScreen(width)) return 18;
  return 16;
};

export const getResponsiveFont = (width: number, baseSize: number): number => {
  const scaled = baseSize * (width / 390);
  return clamp(Math.round(scaled), baseSize - 2, baseSize + 3);
};

export const getResponsiveImageHeight = (width: number, ratio = 0.42): number => {
  return clamp(Math.round(width * ratio), 140, 220);
};
