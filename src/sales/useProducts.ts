import { useApp } from "../AppContext";

export interface ProductOption {
  id: string;
  name: string;
}

export function useProducts() {
  const { products } = useApp();
  const activeProducts: ProductOption[] = products
    .filter(p => p.is_active)
    .map(p => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { products: activeProducts, loading: false };
}
