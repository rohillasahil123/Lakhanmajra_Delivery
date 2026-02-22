import { getEndpoint, API_ENDPOINTS } from '@/config/api';

async function safeGet(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[catalogService] non-ok response', res.status, url);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('[catalogService] fetch error', err, url);
    return null;
  }
}

export async function fetchCategories(): Promise<any[]> {
  const url = getEndpoint(API_ENDPOINTS.CATEGORIES as string);
  const response = await safeGet(url);
  if (!response) return [];
  // Backend returns { success: true, data: [...] }
  const data = response.data || response.categories || [];
  return Array.isArray(data) ? data : [];
}

export async function fetchProducts(params?: { limit?: number; categoryId?: string }): Promise<any[]> {
  let url = getEndpoint(API_ENDPOINTS.PRODUCTS as string);
  const query: string[] = [];
  if (params?.limit) query.push(`limit=${params.limit}`);
  if (params?.categoryId) query.push(`categoryId=${encodeURIComponent(params.categoryId)}`);
  if (query.length) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}${query.join('&')}`;
  }

  const response = await safeGet(url);
  if (!response) return [];
  // Backend returns { success: true, data: { data: [...], total, page, limit } }
  const wrapper = response.data || response.products || [];
  // If wrapper is paginated result (has .data property), extract it
  const data = wrapper.data || wrapper;
  return Array.isArray(data) ? data : [];
}

export async function fetchOffers(): Promise<any[]> {
  // Try offers endpoint first, fall back to products with discounts
  const offersUrl = getEndpoint('/api/offers');
  const offersResponse = await safeGet(offersUrl);
  if (offersResponse) {
    const data = offersResponse.data || offersResponse.offers || [];
    return Array.isArray(data) ? data : [];
  }

  // Fallback: products with discount or flagged as "isOffer"
  const products = await fetchProducts({ limit: 20 });
  return products.filter((p: any) => p.discount || p.isOffer || p.promo || (p.mrp && p.price < p.mrp)).slice(0, 6);
}

export default {
  fetchCategories,
  fetchProducts,
  fetchOffers,
};
