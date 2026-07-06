export interface ChatProductRecommendation {
  productId: string;
  variantId: string | null;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice?: number | null;
  salePrice?: number | null;
  stock: number;
  productUrl: string;
}
