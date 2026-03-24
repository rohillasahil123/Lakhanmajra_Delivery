import { getEndpoint, API_ENDPOINTS } from '@/config/api';
import { Category, Product, OfferUI } from '@/types';

export type FetchProductsPageParams = {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  sortBy?: 'demand' | '-createdAt';
};

export type FetchProductsPageResult = {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

async function safeGet(url: string, options?: { silentNotFound?: boolean }) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (!(options?.silentNotFound && res.status === 404)) {
        console.warn('[catalogService] non-ok response', res.status, url);
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('[catalogService] fetch error', err, url);
    return null;
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const url = getEndpoint(API_ENDPOINTS.CATEGORIES as string);
  const response = await safeGet(url);
  if (!response) return [];
  // Backend returns { success: true, data: [...] }
  const data = response.data || response.categories || [];
  return Array.isArray(data) ? data : [];
}

export async function fetchProductsPage(params?: FetchProductsPageParams): Promise<FetchProductsPageResult> {
  let url = getEndpoint(API_ENDPOINTS.PRODUCTS as string);
  const query: string[] = [];
  const page = Math.max(1, Number(params?.page || 1));
  const limit = Math.max(1, Number(params?.limit || 20));
  const sortBy = params?.sortBy || 'demand';

  query.push(`page=${page}`);
  query.push(`limit=${limit}`);
  query.push(`sortBy=${encodeURIComponent(sortBy)}`);
  if (params?.q?.trim()) query.push(`q=${encodeURIComponent(params.q.trim())}`);
  if (params?.categoryId) query.push(`categoryId=${encodeURIComponent(params.categoryId)}`);
  if (query.length) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}${query.join('&')}`;
  }

  const response = await safeGet(url);
  if (!response) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      hasMore: false,
    };
  }

  const wrapper = response.data || response.products || {};
  const list = Array.isArray(wrapper?.data)
    ? wrapper.data
    : Array.isArray(wrapper)
    ? wrapper
    : [];
  const total = Number(wrapper?.total ?? list.length ?? 0);
  const currentPage = Number(wrapper?.page ?? page);
  const currentLimit = Number(wrapper?.limit ?? limit);
  const loadedCount = currentPage * currentLimit;

  return {
    data: list,
    total,
    page: currentPage,
    limit: currentLimit,
    hasMore: loadedCount < total,
  };
}

export async function fetchProducts(params?: { limit?: number; categoryId?: string }): Promise<Product[]> {
  const result = await fetchProductsPage({
    page: 1,
    limit: params?.limit,
    categoryId: params?.categoryId,
    sortBy: 'demand',
  });
  return result.data;
}

export async function fetchOffers(): Promise<OfferUI[]> {
  // Home offer slider is admin-managed via offers endpoint
  const offersUrl = getEndpoint('/api/offers');
  const offersResponse = await safeGet(offersUrl, { silentNotFound: true });
  if (offersResponse) {
    const data = offersResponse.data || offersResponse.offers || [];
    return Array.isArray(data) ? data : [];
  }

  return [];
}

export default {
  fetchCategories,
  fetchProducts,
  fetchOffers,
};
