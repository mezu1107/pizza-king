/** Single source of truth for business contact details. */
export const BUSINESS = {
  name: "Pizza King",
  tagline: "Fast Food. Big Taste. Young Vibes.",
  type: "Fast Food Restaurant",
  address: "Mankiala, Rawalpindi, Pakistan",
  phone: "0349 8190030",
  phoneIntl: "+92 3173712950",
  whatsapp: "923173712950",
  email: "info@theyoungmalang.com",
} as const;

/** Software/website developer credit (kept subtle, secondary to the restaurant brand). */
export const DEVELOPER = {
  name: "AM Enterprises",
  phone: "03173712950",
} as const;

export const waLink = (text: string) =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;
