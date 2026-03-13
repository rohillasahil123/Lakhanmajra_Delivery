import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getResponsiveFont,
  getScreenPadding,
  createResponsiveStyles,
  responsiveModerateScale,
  responsiveVerticalScale,
} from "@/utils/responsive";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchCategories } from "@/services/catalogService";

// Categories will be loaded from backend

export default function CategoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const screenPadding = getScreenPadding(width);

  const [categories, setCategories] = useState<any[]>([]);

  const getParentCategoryId = (category: any): string => {
    if (!category?.parentCategory) return "";
    if (typeof category.parentCategory === "string")
      return category.parentCategory;
    return category.parentCategory?._id || "";
  };

  const getCategoryIcon = (
    categoryName: string,
  ): keyof typeof MaterialCommunityIcons.glyphMap => {
    const n = String(categoryName || "").toLowerCase();
    if (n.includes("veg") || n.includes("fruit")) return "carrot";
    if (n.includes("bakery") || n.includes("bread")) return "bread-slice";
    if (
      n.includes("atta") ||
      n.includes("rice") ||
      n.includes("pulse") ||
      n.includes("dal")
    )
      return "rice";
    if (n.includes("dairy") || n.includes("milk")) return "cup";
    if (n.includes("masala") || n.includes("spice")) return "chili-mild";
    if (n.includes("snack") || n.includes("namkeen")) return "french-fries";
    if (
      n.includes("personal") ||
      n.includes("care") ||
      n.includes("soap") ||
      n.includes("perfume")
    )
      return "spray-bottle";
    if (n.includes("oil") || n.includes("ghee")) return "bottle-tonic";
    if (n.includes("instant") || n.includes("ready"))
      return "silverware-fork-knife";
    if (n.includes("beverage") || n.includes("drink")) return "coffee";
    if (n.includes("household") || n.includes("clean")) return "broom";
    if (n.includes("dry") || n.includes("nut")) return "peanut";
    if (n.includes("stationery")) return "pencil";
    if (n.includes("baby")) return "baby-face-outline";
    return "shape-outline";
  };

  const mainCategories = categories.filter(
    (category) => !getParentCategoryId(category),
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cats = await fetchCategories();
        if (!mounted) return;
        setCategories(cats || []);
      } catch (e: unknown) {
        console.warn("Failed to load categories", e);
        if (mounted) setCategories([]);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const openProductsByCategory = (categoryId: string, categoryName: string) => {
    router.push({
      pathname: "/products",
      params: {
        categoryId,
        categoryName,
      },
    });
  };

  const handleCategoryPress = (category: any) => {
    const categoryId = category._id || category.id;
    openProductsByCategory(categoryId, category.name);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingVertical: isCompact ? 14 : 18,
            paddingHorizontal: screenPadding,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText
          style={[
            styles.headerTitle,
            { fontSize: getResponsiveFont(width, isCompact ? 18 : 20) },
          ]}
        >
          All Categories
        </ThemedText>
        <TouchableOpacity onPress={() => router.push("/search")}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Categories Grid */}
        <View
          style={[
            styles.categoriesGrid,
            { paddingHorizontal: Math.max(8, screenPadding - 4) },
          ]}
        >
          {mainCategories.map((category: any) =>
            (() => {
              const categoryId = category._id || category.id;
              const iconName = getCategoryIcon(category.name);

              return (
                <View key={categoryId}>
                  <TouchableOpacity
                    style={styles.categoryCard}
                    onPress={() => handleCategoryPress(category)}
                  >
                    <View
                      style={[
                        styles.categoryIconContainer,
                        {
                          width: isCompact
                            ? responsiveModerateScale(52)
                            : responsiveModerateScale(60),
                          height: isCompact
                            ? responsiveModerateScale(52)
                            : responsiveModerateScale(60),
                        },
                        {
                          backgroundColor: (category.color || "#F3F4F6") + "20",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={iconName}
                        size={
                          isCompact
                            ? responsiveModerateScale(24)
                            : responsiveModerateScale(30)
                        }
                        color="#0E7A3D"
                      />
                    </View>
                    <View style={styles.categoryInfo}>
                      <ThemedText
                        style={[
                          styles.categoryName,
                          {
                            fontSize: isCompact
                              ? responsiveModerateScale(14)
                              : responsiveModerateScale(16),
                          },
                        ]}
                      >
                        {category.name}
                      </ThemedText>
                      <ThemedText style={styles.categoryCount}>
                        {category.itemCount || ""}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.arrowIcon}>→</ThemedText>
                  </TouchableOpacity>
                </View>
              );
            })(),
          )}
        </View>

        <View style={{ height: responsiveVerticalScale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createResponsiveStyles({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: "#0E7A3D",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    marginLeft: 12,
  },
  searchIcon: {
    fontSize: 24,
    padding: 8,
  },
  container: {
    flex: 1,
  },
  categoriesGrid: {
    padding: 12,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  arrowIcon: {
    fontSize: 20,
    color: "#9CA3AF",
    marginLeft: 8,
  },
});
