/** Curated fallback when live discovery is unavailable during the public demo. */
export const ALIBABA_DEMO_URL = "https://www.alibaba.com/";

export const alibabaDemoProfile = {
  name: "Alibaba.com",
  industry: "B2B services",
  target_audience:
    "Global wholesale buyers, importers, and SMEs sourcing products from manufacturers and suppliers worldwide.",
  brand_voice: "Technical & authoritative",
  value_proposition:
    "The world’s largest online B2B marketplace — connect with verified manufacturers, source smarter with AI, and buy with order protection.",
  price_range: "Mid-range ($25–$100)",
  campaign_goal: "Lead generation",
  competitors: [
    "Amazon Business",
    "Global Sources",
    "Made-in-China.com",
    "ThomasNet",
  ],
  first_product: {
    product_name: "Accio AI Sourcing Agent",
    value_prop:
      "All-in-one sourcing agent to research, design, source, and communicate faster.",
    price: "Free trial",
    creative_hook:
      "Meet your AI sourcing agent — research smarter, source better",
  },
  /** Brand-matched extras when seeding a demo workspace from Alibaba onboarding. */
  extra_products: [
    {
      product_name: "Trade Assurance",
      value_prop:
        "Order protection from payment to delivery — source with confidence on Alibaba.com.",
      price: "Included",
      creative_hook: "Protected orders from payment to delivery",
      category: "Services",
      key_features: [
        "Payment protection",
        "On-time shipping coverage",
        "Quality dispute support",
      ],
    },
    {
      product_name: "Verified Suppliers",
      value_prop:
        "Connect with audited manufacturers and trading companies ready for wholesale orders.",
      price: "Free to browse",
      creative_hook: "Verified manufacturers, ready to ship wholesale",
      category: "Services",
      key_features: [
        "On-site audits",
        "Business license checks",
        "Global supplier network",
      ],
    },
  ],
} as const;
