import { Dimensions } from "react-native";

const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getWindow = () => Dimensions.get("window");

export const getLayoutMetrics = (width: number, height: number) => {
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 768;

  return {
    isTablet,
    isCompactWidth: width < 380,
    isCompactHeight: height < 760,
    contentMaxWidth: isTablet ? 760 : 560,
  };
};

export const scale = (size: number) =>
  size *
  clamp(
    getLayoutMetrics(getWindow().width, getWindow().height).isTablet
      ? Math.min(getWindow().width, getWindow().height) / 834
      : getWindow().width / guidelineBaseWidth,
    0.88,
    1.2
  );

export const verticalScale = (size: number) =>
  size * clamp(getWindow().height / guidelineBaseHeight, 0.88, 1.18);

export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const isTablet = getLayoutMetrics(
  getWindow().width,
  getWindow().height
).isTablet;
