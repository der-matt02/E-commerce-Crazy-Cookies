export interface DashboardStats {
  products: {
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
  };
  categories: {
    total: number;
  };
  orders: {
    total: number;
    pending: number;
    revenue: number;
  };
  reviews: {
    total: number;
    pending: number;
    approved: number;
  };
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface TopProduct {
  id: string;
  name: string;
  price: number;
  totalSold: number;
}
