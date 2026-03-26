import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Dummy products data
const DUMMY_PRODUCTS = [
  {
    id: "1",
    name: "Premium Rice (5kg)",
    price: 299,
    originalPrice: 399,
    discount: "25% OFF",
    image: "https://via.placeholder.com/200x200/FFE4E6/000000?text=Rice",
    description: "Premium quality basmati rice, perfect for daily meals",
    category: "Groceries",
  },
  {
    id: "2",
    name: "Fresh Milk (1L)",
    price: 65,
    originalPrice: 75,
    discount: "13% OFF",
    image: "https://via.placeholder.com/200x200/DBEAFE/000000?text=Milk",
    description: "Fresh cow milk, pasteurized and homogenized",
    category: "Dairy",
  },
  {
    id: "3",
    name: "Organic Tomatoes (1kg)",
    price: 89,
    originalPrice: 120,
    discount: "26% OFF",
    image: "https://via.placeholder.com/200x200/D1F2EB/000000?text=Tomatoes",
    description: "Fresh organic tomatoes, grown without pesticides",
    category: "Vegetables",
  },
  {
    id: "4",
    name: "Cooking Oil (1L)",
    price: 185,
    originalPrice: 220,
    discount: "16% OFF",
    image: "https://via.placeholder.com/200x200/FEF3C7/000000?text=Oil",
    description: "Refined cooking oil, perfect for all cooking needs",
    category: "Groceries",
  },
  {
    id: "5",
    name: "Fresh Bread Loaf",
    price: 45,
    originalPrice: 55,
    discount: "18% OFF",
    image: "https://via.placeholder.com/200x200/FFE4E6/000000?text=Bread",
    description: "Freshly baked bread loaf, soft and delicious",
    category: "Bakery",
  },
  {
    id: "6",
    name: "Banana (1 dozen)",
    price: 60,
    originalPrice: 80,
    discount: "25% OFF",
    image: "https://via.placeholder.com/200x200/FEF3C7/000000?text=Banana",
    description: "Fresh bananas, rich in potassium and nutrients",
    category: "Fruits",
  },
];

export default function SpecialOffersScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  const addToCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newQuantity = (prev[productId] || 0) - 1;
      if (newQuantity <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQuantity };
    });
  };

  const renderProduct = ({ item }: { item: typeof DUMMY_PRODUCTS[0] }) => {
    const quantity = cart[item.id] || 0;

    return (
      <View style={styles.productCard}>
        <Image source={{ uri: item.image }} style={styles.productImage} />

        <View style={styles.productInfo}>
          <ThemedText style={styles.productName}>{item.name}</ThemedText>
          <ThemedText style={styles.productDescription}>{item.description}</ThemedText>
          <ThemedText style={styles.productCategory}>{item.category}</ThemedText>

          <View style={styles.priceContainer}>
            <ThemedText style={styles.currentPrice}>₹{item.price}</ThemedText>
            <ThemedText style={styles.originalPrice}>₹{item.originalPrice}</ThemedText>
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{item.discount}</ThemedText>
            </View>
          </View>

          {quantity > 0 ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => removeFromCart(item.id)}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#0E7A3D" />
              </TouchableOpacity>
              <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => addToCart(item.id)}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#0E7A3D" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => addToCart(item.id)}
            >
              <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return DUMMY_PRODUCTS.reduce((sum, product) => {
      const quantity = cart[product.id] || 0;
      return sum + product.price * quantity;
    }, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText style={styles.backIcon}>‹</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Special Offers</ThemedText>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push("/cart")}
        >
          <MaterialCommunityIcons name="cart-outline" size={24} color="#0E7A3D" />
          {getTotalItems() > 0 && (
            <View style={styles.cartBadge}>
              <ThemedText style={styles.cartBadgeText}>{getTotalItems()}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={DUMMY_PRODUCTS}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer with total */}
      {getTotalItems() > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <ThemedText style={styles.totalText}>
              Total: ₹{getTotalPrice()}
            </ThemedText>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => router.push("/checkout")}
            >
              <ThemedText style={styles.checkoutText}>Checkout</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F2",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    fontSize: 28,
    color: "#111827",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  cartButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#0E7A3D",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  productList: {
    padding: 16,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0E7A3D",
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: "#F8C200",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  addToCartButton: {
    backgroundColor: "#0E7A3D",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  addToCartText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    minWidth: 30,
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  checkoutButton: {
    backgroundColor: "#0E7A3D",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  checkoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});