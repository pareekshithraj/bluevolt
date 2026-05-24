export type PaymentMethod = "cash" | "upi" | "card";

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  gst: number;
  stock: number;
  category: string;
  created_at: string;
}

export interface Sale {
  id: string;
  date: string;
  total: number;
  gst: number;
  grandTotal: number;
  payment_method: PaymentMethod;
  cashier: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  price: number;
  gst: number;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  date: string;
  total: number;
  notes: string;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: "admin" | "cashier";
}

export interface Stores24Settings {
  lowStockThreshold: number;
  currency: string;
  storeName: string;
}

export interface Stores24Data {
  products: Product[];
  sales: Sale[];
  sales_items: SaleItem[];
  suppliers: Supplier[];
  purchases: Purchase[];
  staff: StaffMember[];
  settings: Stores24Settings;
}
