export interface DbCategory {
  id: string;
  title: string;
  image_url: string;
  active: boolean;
  featured: boolean;
  created_at: string;
}

export interface DbFood {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string;
  category_id: string | null;
  active: boolean;
  featured: boolean;
  rating: number;
  badge: string | null;
  created_at: string;
}

export interface DbDeal {
  id: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  discount_text: string;
  image_url: string;
  badge: string;
  active: boolean;
  featured: boolean;
  created_at: string;
}

export interface DbOrder {
  id: string;
  user_id: string;
  total: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  rider_id: string | null;
  created_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  food_id: string | null;
  title: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface DbProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}
