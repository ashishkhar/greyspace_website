/** Site content types, defaults and validation. Safe to import from client components. */

export const ICONS = [
  "home",
  "layers",
  "compass",
  "ruler",
  "sofa",
  "leaf",
  "sun",
  "column",
  "grid",
  "key",
] as const;
export type IconName = (typeof ICONS)[number];

export type Chapter = {
  label: string;
  title: string;
  architect: string;
  quote: string;
  body: string;
};

export type SiteContent = {
  seo: { title: string; description: string };
  brand: {
    name: string;
    tagline: string;
    email: string;
    phone: string;
    address: string;
    instagram: string;
    linkedin: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  /** Four chapters, one per 3D scene: light, less, nature, flow. Count is fixed. */
  chapters: Chapter[];
  finale: { quote: string; author: string; cta: string };
  studio: { eyebrow: string; title: string; body: string; image: string; imageAlt: string };
  services: { title: string; intro: string; items: { icon: IconName; title: string; body: string }[] };
  stats: { value: string; label: string }[];
  projects: {
    title: string;
    intro: string;
    items: { title: string; location: string; category: string; year: string; image: string; summary: string }[];
  };
  process: { title: string; steps: { title: string; body: string }[] };
  testimonials: { title: string; items: { quote: string; name: string; location: string }[] };
  contact: { eyebrow: string; title: string; body: string; button: string; success: string };
  moodboard: {
    headlines: string[];
    subtitle: string;
    introTitle: string;
    introBody: string;
  };
};

export const CHAPTER_SCENES = ["Light", "Less", "Nature", "Flow"] as const;

export const DEFAULT_SITE: SiteContent = {
  seo: {
    title: "Grey Spaces — Architecture & Interiors",
    description:
      "Grey Spaces is an architecture and interior design studio creating calm, light-filled spaces that are built to last.",
  },
  brand: {
    name: "Grey Spaces",
    tagline: "Architecture · Interiors · Landscape",
    email: "hello@studiogreyspaces.com",
    phone: "",
    address: "",
    instagram: "",
    linkedin: "",
  },
  hero: {
    eyebrow: "Architecture · Interiors · Landscape",
    title: "Grey Spaces",
    subtitle: "We design quiet, light-filled spaces that feel inevitable — and last for generations.",
    primaryCta: "Start a project",
    secondaryCta: "Explore the studio",
  },
  chapters: [
    {
      label: "Light",
      title: "Light is the first material.",
      architect: "After Tadao Ando",
      quote: "Bare concrete, a single cut, and the sun does the rest.",
      body: "We begin every project by studying how daylight enters, moves and leaves. Openings are placed with intent, so a room changes character from morning to dusk.",
    },
    {
      label: "Less",
      title: "Less, but better.",
      architect: "Ludwig Mies van der Rohe",
      quote: "Less is more.",
      body: "A floating roof, a free plan and honest materials. We remove everything that does not serve the space, until what remains feels calm and complete.",
    },
    {
      label: "Nature",
      title: "Built with the land, not on it.",
      architect: "After Frank Lloyd Wright",
      quote: "Study nature, love nature, stay close to nature.",
      body: "Terraces reach over water, stone rises from the ground. We let the site lead — its slope, its trees, its views — so the building belongs where it stands.",
    },
    {
      label: "Flow",
      title: "Space in motion.",
      architect: "Zaha Hadid",
      quote: "There are 360 degrees, so why stick to one?",
      body: "Where a project calls for it, we let form move freely. Continuous surfaces guide people through space the way water finds its course.",
    },
  ],
  finale: {
    quote: "Architecture is the thoughtful making of space.",
    author: "Louis Kahn",
    cta: "Begin your project",
  },
  studio: {
    eyebrow: "The studio",
    title: "Recreating dream homes that last.",
    body: "Grey Spaces is a design studio for architecture and interiors. From the first sketch to the final finish, one team carries your project with care — balancing beauty, budget and the way you actually live.",
    image: "",
    imageAlt: "Grey Spaces studio",
  },
  services: {
    title: "What we do",
    intro: "Full-service design, from the shell of the building to the last detail inside.",
    items: [
      { icon: "home", title: "Architecture", body: "New homes and buildings, from concept to construction drawings." },
      { icon: "sofa", title: "Interior design", body: "Complete interiors — layouts, materials, lighting and furniture." },
      { icon: "layers", title: "Renovation", body: "Thoughtful remodelling of kitchens, bathrooms and whole homes." },
      { icon: "leaf", title: "Landscape", body: "Gardens, courtyards and terraces that extend the living space." },
    ],
  },
  // Left empty on purpose: real numbers only. The section hides until the admin adds some.
  stats: [],
  projects: {
    title: "Selected work",
    intro: "A few of the spaces we have shaped.",
    items: [
      { title: "Luxe Living", location: "Residence", category: "Interiors", year: "2025", image: "", summary: "" },
      { title: "Soft Minimalism", location: "Apartment", category: "Interiors", year: "2025", image: "", summary: "" },
      { title: "Courtyard House", location: "Villa", category: "Architecture", year: "2024", image: "", summary: "" },
      { title: "Studio Kitchen", location: "Renovation", category: "Remodel", year: "2024", image: "", summary: "" },
    ],
  },
  process: {
    title: "How we work",
    steps: [
      { title: "Listen", body: "We start with how you live, what you love and what the site offers." },
      { title: "Imagine", body: "Concepts, moodboards and 3D views until the direction feels right." },
      { title: "Refine", body: "Materials, details and drawings, resolved with you step by step." },
      { title: "Build", body: "We stay on site with you until the last finish is in place." },
    ],
  },
  testimonials: {
    title: "Clients about our work",
    // Real client words only. The section hides until the admin adds one.
    items: [],
  },
  contact: {
    eyebrow: "Inquire",
    title: "Let’s bring your vision to life",
    body: "Tell us a little about your space. We will get back to you within two working days.",
    button: "Send",
    success: "Thank you — we will be in touch shortly.",
  },
  moodboard: {
    headlines: ["Explore Your Design Vision", "Your Space, Visualized", "Step Into Your Future Space"],
    subtitle: "Review curated design concepts and share your thoughts effortlessly.",
    introTitle: "A quiet room for your taste",
    introBody:
      "A guided visual experience where you can explore design ideas and respond with what you love—simply, in your own words.",
  },
};


// ---------- sanitizing (admin input is trusted-ish, but keep shapes and sizes sane) ----------

function str(v: unknown, fallback: string, max = 2000): string {
  if (typeof v !== "string") return fallback;
  return v.slice(0, max);
}

/** Images must be our own uploads or https URLs. */
function img(v: unknown, fallback: string): string {
  const s = str(v, fallback, 1000).trim();
  if (!s) return "";
  if (s.startsWith("/uploads/") && !s.includes("..")) return s;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  return fallback;
}

function list<T>(v: unknown, fallback: T[], each: (item: unknown, i: number) => T, max = 24): T[] {
  if (!Array.isArray(v)) return fallback;
  return v.slice(0, max).map(each);
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function sanitizeSite(input: unknown): SiteContent {
  const d = DEFAULT_SITE;
  const i = obj(input);
  const seo = obj(i.seo);
  const brand = obj(i.brand);
  const hero = obj(i.hero);
  const finale = obj(i.finale);
  const studio = obj(i.studio);
  const services = obj(i.services);
  const projects = obj(i.projects);
  const proc = obj(i.process);
  const testimonials = obj(i.testimonials);
  const contact = obj(i.contact);
  const mood = obj(i.moodboard);

  const chaptersIn = Array.isArray(i.chapters) ? i.chapters : [];

  return {
    seo: { title: str(seo.title, d.seo.title, 120), description: str(seo.description, d.seo.description, 300) },
    brand: {
      name: str(brand.name, d.brand.name, 80),
      tagline: str(brand.tagline, d.brand.tagline, 120),
      email: str(brand.email, d.brand.email, 120),
      phone: str(brand.phone, d.brand.phone, 40),
      address: str(brand.address, d.brand.address, 300),
      instagram: str(brand.instagram, d.brand.instagram, 300),
      linkedin: str(brand.linkedin, d.brand.linkedin, 300),
    },
    hero: {
      eyebrow: str(hero.eyebrow, d.hero.eyebrow, 120),
      title: str(hero.title, d.hero.title, 80),
      subtitle: str(hero.subtitle, d.hero.subtitle, 300),
      primaryCta: str(hero.primaryCta, d.hero.primaryCta, 40),
      secondaryCta: str(hero.secondaryCta, d.hero.secondaryCta, 40),
    },
    chapters: d.chapters.map((fallback, idx) => {
      const c = obj(chaptersIn[idx]);
      return {
        label: str(c.label, fallback.label, 40),
        title: str(c.title, fallback.title, 120),
        architect: str(c.architect, fallback.architect, 80),
        quote: str(c.quote, fallback.quote, 200),
        body: str(c.body, fallback.body, 600),
      };
    }),
    finale: {
      quote: str(finale.quote, d.finale.quote, 200),
      author: str(finale.author, d.finale.author, 80),
      cta: str(finale.cta, d.finale.cta, 40),
    },
    studio: {
      eyebrow: str(studio.eyebrow, d.studio.eyebrow, 60),
      title: str(studio.title, d.studio.title, 160),
      body: str(studio.body, d.studio.body, 1500),
      image: img(studio.image, d.studio.image),
      imageAlt: str(studio.imageAlt, d.studio.imageAlt, 160),
    },
    services: {
      title: str(services.title, d.services.title, 80),
      intro: str(services.intro, d.services.intro, 400),
      items: list(services.items, d.services.items, (raw) => {
        const s = obj(raw);
        const icon = (ICONS as readonly string[]).includes(String(s.icon)) ? (s.icon as IconName) : "home";
        return { icon, title: str(s.title, "", 60), body: str(s.body, "", 300) };
      }, 12),
    },
    stats: list(i.stats, d.stats, (raw) => {
      const s = obj(raw);
      return { value: str(s.value, "", 16), label: str(s.label, "", 60) };
    }, 6),
    projects: {
      title: str(projects.title, d.projects.title, 80),
      intro: str(projects.intro, d.projects.intro, 400),
      items: list(projects.items, d.projects.items, (raw) => {
        const p = obj(raw);
        return {
          title: str(p.title, "", 80),
          location: str(p.location, "", 80),
          category: str(p.category, "", 40),
          year: str(p.year, "", 12),
          image: img(p.image, ""),
          summary: str(p.summary, "", 400),
        };
      }, 24),
    },
    process: {
      title: str(proc.title, d.process.title, 80),
      steps: list(proc.steps, d.process.steps, (raw) => {
        const s = obj(raw);
        return { title: str(s.title, "", 60), body: str(s.body, "", 300) };
      }, 8),
    },
    testimonials: {
      title: str(testimonials.title, d.testimonials.title, 80),
      items: list(testimonials.items, d.testimonials.items, (raw) => {
        const t = obj(raw);
        return { quote: str(t.quote, "", 600), name: str(t.name, "", 80), location: str(t.location, "", 80) };
      }, 12),
    },
    contact: {
      eyebrow: str(contact.eyebrow, d.contact.eyebrow, 40),
      title: str(contact.title, d.contact.title, 120),
      body: str(contact.body, d.contact.body, 400),
      button: str(contact.button, d.contact.button, 30),
      success: str(contact.success, d.contact.success, 200),
    },
    moodboard: {
      headlines: list(mood.headlines, d.moodboard.headlines, (raw) => str(raw, "", 80), 6).filter(Boolean),
      subtitle: str(mood.subtitle, d.moodboard.subtitle, 300),
      introTitle: str(mood.introTitle, d.moodboard.introTitle, 120),
      introBody: str(mood.introBody, d.moodboard.introBody, 600),
    },
  };
}

