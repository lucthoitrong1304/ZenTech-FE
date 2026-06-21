export interface ChatProductRecommendation {
  productId: string;
  variantId: string | null;
  name: string;
  imageUrl: string;
  price: number;
  stock: number;
  productUrl: string;
}
