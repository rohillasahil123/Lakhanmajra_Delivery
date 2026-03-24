/**
 * Offer Carousel Component
 * Displays horizontal carousel of promotional offers
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  TouchableOpacity,
  View,
  StyleSheet,
  ViewToken,
} from 'react-native';
import { ThemedText } from './themed-text';
import { OfferUI } from '@/types';
import { verticalScale, scale } from 'react-native-size-matters';

interface OfferCarouselProps {
  offers: OfferUI[];
  onOfferPress?: (offer: OfferUI) => void;
  autoPlayInterval?: number;
}

/**
 * Reusable offer carousel with auto-scroll functionality
 * Extracted from home.tsx to improve code organization
 */
export const OfferCarousel: React.FC<OfferCarouselProps> = ({
  offers,
  onOfferPress,
  autoPlayInterval = 3000,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!offers || offers.length === 0) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % offers.length);
      flatListRef.current?.scrollToIndex({
        index: (activeIndex + 1) % offers.length,
        animated: true,
      });
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [offers.length, activeIndex, autoPlayInterval]);

  const renderOffer = ({ item }: { item: OfferUI }) => (
    <TouchableOpacity
      style={styles.offerContainer}
      onPress={() => onOfferPress?.(item)}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={typeof item.image === 'string' ? { uri: item.image } : item.image}
        style={styles.offerImage}
        imageStyle={styles.imageStyle}
        resizeMode="cover"
      >
        <View style={styles.offerOverlay}>
          {item.title && (
            <ThemedText style={styles.offerTitle} numberOfLines={2}>
              {item.title}
            </ThemedText>
          )}
          {item.subtitle && (
            <ThemedText style={styles.offerSubtitle} numberOfLines={1}>
              {item.subtitle}
            </ThemedText>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0 && viewableItems[0]) {
        const index = viewableItems[0].index;
        if (index !== null && index !== undefined) {
          setActiveIndex(index);
        }
      }
    },
  ).current;

  if (!offers || offers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id || `offer-${Math.random()}`}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        showsHorizontalScrollIndicator={false}
      />

      {/* Pagination Dots */}
      {offers.length > 1 && (
        <View style={styles.dotsContainer}>
          {offers.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                { opacity: idx === activeIndex ? 1 : 0.4 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: verticalScale(12),
  },
  offerContainer: {
    width: '100%',
    paddingHorizontal: scale(16),
  },
  offerImage: {
    height: verticalScale(180),
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: 12,
  },
  offerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: scale(16),
    justifyContent: 'flex-end',
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  offerSubtitle: {
    fontSize: 14,
    color: '#f0f0f0',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: verticalScale(12),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
});
