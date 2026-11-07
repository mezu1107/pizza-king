// Mirrors public.pizza_option_catalog() in the database; the server re-prices every option.
export interface PizzaOption { key: string; label: string; price: number }

export const CRUSTS: PizzaOption[] = [
  { key: "crust:pan", label: "Pan Crust", price: 0 },
  { key: "crust:thin", label: "Thin & Crispy", price: 50 },
  { key: "crust:stuffed", label: "Stuffed Crust", price: 250 },
  { key: "crust:crown", label: "Crown Crust", price: 300 },
];
export const TOPPINGS: PizzaOption[] = [
  { key: "top:cheese", label: "Extra Cheese", price: 150 },
  { key: "top:chicken", label: "Extra Chicken", price: 180 },
  { key: "top:mushroom", label: "Mushrooms", price: 100 },
  { key: "top:jalapeno", label: "Jalapenos", price: 80 },
  { key: "top:olives", label: "Olives", price: 80 },
  { key: "top:onion", label: "Onions", price: 50 },
];
export const DIPS: PizzaOption[] = [
  { key: "dip:garlic", label: "Garlic Mayo Dip", price: 60 },
  { key: "dip:ranch", label: "Ranch Dip", price: 70 },
  { key: "dip:mustard", label: "Honey Mustard Dip", price: 70 },
];
const ALL = [...CRUSTS, ...TOPPINGS, ...DIPS];

export const optionByKey = (k: string) => ALL.find((o) => o.key === k);
export const optionsTotal = (keys: string[]) => keys.reduce((s, k) => s + (optionByKey(k)?.price || 0), 0);
export const isPizza = (title: string, category?: string | null) => /pizza/i.test(`${title} ${category || ""}`);
