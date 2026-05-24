import type {
  Product,
  Purchase,
  Sale,
  SaleItem,
  StaffMember,
  Stores24Data,
  Stores24Settings,
  Supplier,
} from "@/lib/stores24/types";

const STORAGE_KEY = "stores24_data_v1";
const LAST_SALE_KEY = "stores24_last_sale_id";

const defaultSettings: Stores24Settings = {
  lowStockThreshold: 10,
  currency: "INR",
  storeName: "Stores24",
};

const sampleProducts: Product[] = [
  {
    id: "p-rice-5kg",
    name: "Rice 5kg",
    barcode: "890100000001",
    price: 450,
    gst: 5,
    stock: 30,
    category: "Grocery",
    created_at: new Date().toISOString(),
  },
  {
    id: "p-milk-1l",
    name: "Milk 1L",
    barcode: "890100000002",
    price: 60,
    gst: 5,
    stock: 80,
    category: "Dairy",
    created_at: new Date().toISOString(),
  },
  {
    id: "p-sugar-1kg",
    name: "Sugar 1kg",
    barcode: "890100000003",
    price: 50,
    gst: 5,
    stock: 45,
    category: "Grocery",
    created_at: new Date().toISOString(),
  },
];

const sampleSuppliers: Supplier[] = [
  {
    id: "s-1",
    name: "Prime Wholesale Traders",
    phone: "+91 90000 00001",
    address: "MG Road, Bengaluru",
  },
];

const sampleStaff: StaffMember[] = [
  { id: "st-1", name: "Admin User", username: "admin", role: "admin" },
  { id: "st-2", name: "Cashier One", username: "cashier", role: "cashier" },
];

const defaultData: Stores24Data = {
  products: sampleProducts,
  sales: [],
  sales_items: [],
  suppliers: sampleSuppliers,
  purchases: [],
  staff: sampleStaff,
  settings: defaultSettings,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readStores24Data(): Stores24Data {
  if (!isBrowser()) {
    return defaultData;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }

  try {
    const parsed = JSON.parse(raw) as Stores24Data;
    return {
      products: parsed.products ?? [],
      sales: parsed.sales ?? [],
      sales_items: parsed.sales_items ?? [],
      suppliers: parsed.suppliers ?? [],
      purchases: parsed.purchases ?? [],
      staff: parsed.staff ?? sampleStaff,
      settings: parsed.settings ?? defaultSettings,
    };
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
}

export function writeStores24Data(data: Stores24Data): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function withStores24Data(mutator: (data: Stores24Data) => Stores24Data): Stores24Data {
  const current = readStores24Data();
  const next = mutator(current);
  writeStores24Data(next);
  return next;
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function setLastSaleId(id: string): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(LAST_SALE_KEY, id);
}

export function getLastSaleId(): string | null {
  if (!isBrowser()) {
    return null;
  }
  return window.localStorage.getItem(LAST_SALE_KEY);
}

export function addSale(input: { sale: Sale; items: SaleItem[] }): Stores24Data {
  return withStores24Data((data) => {
    const updatedProducts = data.products.map((product) => {
      const item = input.items.find((saleItem) => saleItem.product_id === product.id);
      if (!item) {
        return product;
      }
      return {
        ...product,
        stock: Math.max(0, product.stock - item.qty),
      };
    });

    return {
      ...data,
      products: updatedProducts,
      sales: [input.sale, ...data.sales],
      sales_items: [...input.items, ...data.sales_items],
    };
  });
}

export function addPurchase(purchase: Purchase): Stores24Data {
  return withStores24Data((data) => ({
    ...data,
    purchases: [purchase, ...data.purchases],
  }));
}
