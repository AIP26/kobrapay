// ─── Catálogo de países, monedas y leyes locales para KobraPay Global ──────────

export interface CountryConfig {
  code: string;           // ISO 3166-1 alpha-2
  name: string;           // Nombre en español
  nameEn: string;         // Nombre en inglés
  flag: string;           // Emoji de bandera
  currency: string;       // Código ISO 4217
  currencySymbol: string; // Símbolo de moneda
  currencyName: string;   // Nombre de la moneda en español
  currencyNameEn: string; // Nombre de la moneda en inglés
  locale: string;         // Locale para formateo
  stripeCurrency: string; // Código en minúsculas para Stripe
  stripeSupported: boolean;
  // Marco legal para firma electrónica
  legalFramework: {
    title: string;        // Título del marco legal (ES)
    titleEn: string;      // Título del marco legal (EN)
    laws: string[];       // Leyes aplicables (ES)
    lawsEn: string[];     // Leyes aplicables (EN)
    description: string;  // Descripción legal (ES)
    descriptionEn: string;// Descripción legal (EN)
  };
  // Configuración regional
  phonePrefix: string;
  taxName: string;        // Nombre del impuesto local
  taxRate: number;        // Tasa de impuesto (0-1)
}

export const COUNTRIES: CountryConfig[] = [
  // ── PRIORIDAD 1: México (default) ─────────────────────────────────────────
  {
    code: "MX",
    name: "México",
    nameEn: "Mexico",
    flag: "🇲🇽",
    currency: "MXN",
    currencySymbol: "$",
    currencyName: "Pesos Mexicanos",
    currencyNameEn: "Mexican Pesos",
    locale: "es-MX",
    stripeCurrency: "mxn",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (México)",
      titleEn: "Legal Validity — Electronic Signature (Mexico)",
      laws: [
        "Código de Comercio Arts. 89–114",
        "Ley de Firma Electrónica Avanzada (LFEA)",
        "NOM-151-SCFI-2016",
        "Ley Federal de Protección de Datos Personales (LFPDPPP)",
      ],
      lawsEn: [
        "Commercial Code Arts. 89–114",
        "Advanced Electronic Signature Law (LFEA)",
        "NOM-151-SCFI-2016",
        "Federal Law on Protection of Personal Data (LFPDPPP)",
      ],
      description:
        "De conformidad con los Artículos 89, 89 Bis, 90 y 93 del Código de Comercio de los Estados Unidos Mexicanos, la firma electrónica plasmada en el presente contrato tiene plena validez jurídica y produce los mismos efectos que una firma autógrafa.",
      descriptionEn:
        "Pursuant to Articles 89, 89 Bis, 90 and 93 of the Mexican Commercial Code, the electronic signature on this contract has full legal validity and produces the same effects as a handwritten signature.",
    },
    phonePrefix: "+52",
    taxName: "IVA",
    taxRate: 0.16,
  },

  // ── PRIORIDAD 2: Estados Unidos ────────────────────────────────────────────
  {
    code: "US",
    name: "Estados Unidos",
    nameEn: "United States",
    flag: "🇺🇸",
    currency: "USD",
    currencySymbol: "$",
    currencyName: "Dólares Americanos",
    currencyNameEn: "US Dollars",
    locale: "en-US",
    stripeCurrency: "usd",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (EE.UU.)",
      titleEn: "Legal Validity — Electronic Signature (USA)",
      laws: [
        "Electronic Signatures in Global and National Commerce Act (ESIGN Act)",
        "Uniform Electronic Transactions Act (UETA)",
        "15 U.S.C. § 7001",
      ],
      lawsEn: [
        "Electronic Signatures in Global and National Commerce Act (ESIGN Act)",
        "Uniform Electronic Transactions Act (UETA)",
        "15 U.S.C. § 7001",
      ],
      description:
        "De conformidad con la Ley ESIGN (15 U.S.C. § 7001) y la Ley UETA, la firma electrónica en este contrato tiene plena validez legal en los Estados Unidos y es legalmente vinculante.",
      descriptionEn:
        "Pursuant to the ESIGN Act (15 U.S.C. § 7001) and UETA, the electronic signature on this contract has full legal validity in the United States and is legally binding.",
    },
    phonePrefix: "+1",
    taxName: "Sales Tax",
    taxRate: 0,
  },

  // ── PRIORIDAD 3: Canadá ────────────────────────────────────────────────────
  {
    code: "CA",
    name: "Canadá",
    nameEn: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    currencySymbol: "$",
    currencyName: "Dólares Canadienses",
    currencyNameEn: "Canadian Dollars",
    locale: "en-CA",
    stripeCurrency: "cad",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Canadá)",
      titleEn: "Legal Validity — Electronic Signature (Canada)",
      laws: [
        "Personal Information Protection and Electronic Documents Act (PIPEDA)",
        "Uniform Electronic Commerce Act (UECA)",
        "Electronic Commerce Act (provincial)",
      ],
      lawsEn: [
        "Personal Information Protection and Electronic Documents Act (PIPEDA)",
        "Uniform Electronic Commerce Act (UECA)",
        "Electronic Commerce Act (provincial)",
      ],
      description:
        "De conformidad con PIPEDA y la Ley de Comercio Electrónico Uniforme de Canadá, la firma electrónica en este contrato es legalmente válida y vinculante en todo el territorio canadiense.",
      descriptionEn:
        "Pursuant to PIPEDA and Canada's Uniform Electronic Commerce Act, the electronic signature on this contract is legally valid and binding throughout Canadian territory.",
    },
    phonePrefix: "+1",
    taxName: "GST/HST",
    taxRate: 0.05,
  },

  // ── PRIORIDAD 4: España ────────────────────────────────────────────────────
  {
    code: "ES",
    name: "España",
    nameEn: "Spain",
    flag: "🇪🇸",
    currency: "EUR",
    currencySymbol: "€",
    currencyName: "Euros",
    currencyNameEn: "Euros",
    locale: "es-ES",
    stripeCurrency: "eur",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (España / UE)",
      titleEn: "Legal Validity — Electronic Signature (Spain / EU)",
      laws: [
        "Reglamento eIDAS (UE) 910/2014",
        "Ley 6/2020 de firma electrónica",
        "Ley Orgánica 3/2018 (LOPDGDD)",
        "RGPD — Reglamento General de Protección de Datos",
      ],
      lawsEn: [
        "eIDAS Regulation (EU) 910/2014",
        "Law 6/2020 on electronic signatures",
        "Organic Law 3/2018 (LOPDGDD)",
        "GDPR — General Data Protection Regulation",
      ],
      description:
        "De conformidad con el Reglamento eIDAS (UE) 910/2014 y la Ley 6/2020, la firma electrónica en este contrato tiene plena validez jurídica en España y en toda la Unión Europea.",
      descriptionEn:
        "Pursuant to eIDAS Regulation (EU) 910/2014 and Law 6/2020, the electronic signature on this contract has full legal validity in Spain and throughout the European Union.",
    },
    phonePrefix: "+34",
    taxName: "IVA",
    taxRate: 0.21,
  },

  // ── Colombia ───────────────────────────────────────────────────────────────
  {
    code: "CO",
    name: "Colombia",
    nameEn: "Colombia",
    flag: "🇨🇴",
    currency: "COP",
    currencySymbol: "$",
    currencyName: "Pesos Colombianos",
    currencyNameEn: "Colombian Pesos",
    locale: "es-CO",
    stripeCurrency: "cop",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Colombia)",
      titleEn: "Legal Validity — Electronic Signature (Colombia)",
      laws: [
        "Ley 527 de 1999 (Comercio Electrónico)",
        "Decreto 2364 de 2012 (Firma Electrónica)",
        "Ley 1581 de 2012 (Protección de Datos)",
      ],
      lawsEn: [
        "Law 527 of 1999 (Electronic Commerce)",
        "Decree 2364 of 2012 (Electronic Signature)",
        "Law 1581 of 2012 (Data Protection)",
      ],
      description:
        "De conformidad con la Ley 527 de 1999 y el Decreto 2364 de 2012, la firma electrónica en este contrato tiene plena validez jurídica en Colombia.",
      descriptionEn:
        "Pursuant to Law 527 of 1999 and Decree 2364 of 2012, the electronic signature on this contract has full legal validity in Colombia.",
    },
    phonePrefix: "+57",
    taxName: "IVA",
    taxRate: 0.19,
  },

  // ── Argentina ──────────────────────────────────────────────────────────────
  {
    code: "AR",
    name: "Argentina",
    nameEn: "Argentina",
    flag: "🇦🇷",
    currency: "ARS",
    currencySymbol: "$",
    currencyName: "Pesos Argentinos",
    currencyNameEn: "Argentine Pesos",
    locale: "es-AR",
    stripeCurrency: "ars",
    stripeSupported: false, // Stripe no opera directamente en AR
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Argentina)",
      titleEn: "Legal Validity — Electronic Signature (Argentina)",
      laws: [
        "Ley 25.506 de Firma Digital",
        "Decreto 182/2019",
        "Ley 25.326 de Protección de Datos Personales",
      ],
      lawsEn: [
        "Law 25.506 on Digital Signature",
        "Decree 182/2019",
        "Law 25.326 on Personal Data Protection",
      ],
      description:
        "De conformidad con la Ley 25.506 de Firma Digital, la firma electrónica en este contrato tiene validez jurídica en la República Argentina.",
      descriptionEn:
        "Pursuant to Law 25.506 on Digital Signature, the electronic signature on this contract has legal validity in the Argentine Republic.",
    },
    phonePrefix: "+54",
    taxName: "IVA",
    taxRate: 0.21,
  },

  // ── Brasil ─────────────────────────────────────────────────────────────────
  {
    code: "BR",
    name: "Brasil",
    nameEn: "Brazil",
    flag: "🇧🇷",
    currency: "BRL",
    currencySymbol: "R$",
    currencyName: "Reales Brasileños",
    currencyNameEn: "Brazilian Reais",
    locale: "pt-BR",
    stripeCurrency: "brl",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Brasil)",
      titleEn: "Legal Validity — Electronic Signature (Brazil)",
      laws: [
        "Medida Provisória 2.200-2/2001 (ICP-Brasil)",
        "Lei 14.063/2020 (Assinatura Eletrônica)",
        "Lei 13.709/2018 — LGPD (Proteção de Dados)",
      ],
      lawsEn: [
        "Provisional Measure 2.200-2/2001 (ICP-Brasil)",
        "Law 14.063/2020 (Electronic Signature)",
        "Law 13.709/2018 — LGPD (Data Protection)",
      ],
      description:
        "De conformidad con la Ley 14.063/2020 y la MP 2.200-2/2001, la firma electrónica en este contrato tiene plena validez jurídica en Brasil.",
      descriptionEn:
        "Pursuant to Law 14.063/2020 and MP 2.200-2/2001, the electronic signature on this contract has full legal validity in Brazil.",
    },
    phonePrefix: "+55",
    taxName: "ICMS/ISS",
    taxRate: 0.12,
  },

  // ── Chile ──────────────────────────────────────────────────────────────────
  {
    code: "CL",
    name: "Chile",
    nameEn: "Chile",
    flag: "🇨🇱",
    currency: "CLP",
    currencySymbol: "$",
    currencyName: "Pesos Chilenos",
    currencyNameEn: "Chilean Pesos",
    locale: "es-CL",
    stripeCurrency: "clp",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Chile)",
      titleEn: "Legal Validity — Electronic Signature (Chile)",
      laws: [
        "Ley 19.799 de Documentos Electrónicos y Firma Electrónica",
        "Decreto Supremo 181/2002",
        "Ley 19.628 de Protección de la Vida Privada",
      ],
      lawsEn: [
        "Law 19.799 on Electronic Documents and Electronic Signature",
        "Supreme Decree 181/2002",
        "Law 19.628 on Protection of Private Life",
      ],
      description:
        "De conformidad con la Ley 19.799, la firma electrónica en este contrato tiene plena validez jurídica en la República de Chile.",
      descriptionEn:
        "Pursuant to Law 19.799, the electronic signature on this contract has full legal validity in the Republic of Chile.",
    },
    phonePrefix: "+56",
    taxName: "IVA",
    taxRate: 0.19,
  },

  // ── Perú ───────────────────────────────────────────────────────────────────
  {
    code: "PE",
    name: "Perú",
    nameEn: "Peru",
    flag: "🇵🇪",
    currency: "PEN",
    currencySymbol: "S/",
    currencyName: "Soles Peruanos",
    currencyNameEn: "Peruvian Soles",
    locale: "es-PE",
    stripeCurrency: "pen",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Perú)",
      titleEn: "Legal Validity — Electronic Signature (Peru)",
      laws: [
        "Ley 27269 de Firmas y Certificados Digitales",
        "Decreto Supremo 052-2008-PCM",
        "Ley 29733 de Protección de Datos Personales",
      ],
      lawsEn: [
        "Law 27269 on Digital Signatures and Certificates",
        "Supreme Decree 052-2008-PCM",
        "Law 29733 on Personal Data Protection",
      ],
      description:
        "De conformidad con la Ley 27269, la firma electrónica en este contrato tiene plena validez jurídica en la República del Perú.",
      descriptionEn:
        "Pursuant to Law 27269, the electronic signature on this contract has full legal validity in the Republic of Peru.",
    },
    phonePrefix: "+51",
    taxName: "IGV",
    taxRate: 0.18,
  },

  // ── Reino Unido ────────────────────────────────────────────────────────────
  {
    code: "GB",
    name: "Reino Unido",
    nameEn: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    currencySymbol: "£",
    currencyName: "Libras Esterlinas",
    currencyNameEn: "British Pounds",
    locale: "en-GB",
    stripeCurrency: "gbp",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Reino Unido)",
      titleEn: "Legal Validity — Electronic Signature (United Kingdom)",
      laws: [
        "Electronic Communications Act 2000",
        "Electronic Signatures Regulations 2002",
        "UK GDPR / Data Protection Act 2018",
      ],
      lawsEn: [
        "Electronic Communications Act 2000",
        "Electronic Signatures Regulations 2002",
        "UK GDPR / Data Protection Act 2018",
      ],
      description:
        "De conformidad con la Electronic Communications Act 2000 y las Electronic Signatures Regulations 2002, la firma electrónica en este contrato es legalmente válida en el Reino Unido.",
      descriptionEn:
        "Pursuant to the Electronic Communications Act 2000 and Electronic Signatures Regulations 2002, the electronic signature on this contract is legally valid in the United Kingdom.",
    },
    phonePrefix: "+44",
    taxName: "VAT",
    taxRate: 0.20,
  },

  // ── Alemania ───────────────────────────────────────────────────────────────
  {
    code: "DE",
    name: "Alemania",
    nameEn: "Germany",
    flag: "🇩🇪",
    currency: "EUR",
    currencySymbol: "€",
    currencyName: "Euros",
    currencyNameEn: "Euros",
    locale: "de-DE",
    stripeCurrency: "eur",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Alemania / UE)",
      titleEn: "Legal Validity — Electronic Signature (Germany / EU)",
      laws: [
        "Reglamento eIDAS (UE) 910/2014",
        "Signaturgesetz (SigG)",
        "RGPD — Reglamento General de Protección de Datos",
        "Bundesdatenschutzgesetz (BDSG)",
      ],
      lawsEn: [
        "eIDAS Regulation (EU) 910/2014",
        "Signature Act (SigG)",
        "GDPR — General Data Protection Regulation",
        "Federal Data Protection Act (BDSG)",
      ],
      description:
        "De conformidad con el Reglamento eIDAS (UE) 910/2014, la firma electrónica en este contrato tiene plena validez jurídica en Alemania y en toda la Unión Europea.",
      descriptionEn:
        "Pursuant to eIDAS Regulation (EU) 910/2014, the electronic signature on this contract has full legal validity in Germany and throughout the European Union.",
    },
    phonePrefix: "+49",
    taxName: "MwSt (VAT)",
    taxRate: 0.19,
  },

  // ── Francia ────────────────────────────────────────────────────────────────
  {
    code: "FR",
    name: "Francia",
    nameEn: "France",
    flag: "🇫🇷",
    currency: "EUR",
    currencySymbol: "€",
    currencyName: "Euros",
    currencyNameEn: "Euros",
    locale: "fr-FR",
    stripeCurrency: "eur",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Francia / UE)",
      titleEn: "Legal Validity — Electronic Signature (France / EU)",
      laws: [
        "Reglamento eIDAS (UE) 910/2014",
        "Loi pour la confiance dans l'économie numérique (LCEN)",
        "RGPD — Règlement général sur la protection des données",
      ],
      lawsEn: [
        "eIDAS Regulation (EU) 910/2014",
        "Law for confidence in the digital economy (LCEN)",
        "GDPR — General Data Protection Regulation",
      ],
      description:
        "De conformidad con el Reglamento eIDAS (UE) 910/2014 y la LCEN, la firma electrónica en este contrato tiene plena validez jurídica en Francia y en toda la Unión Europea.",
      descriptionEn:
        "Pursuant to eIDAS Regulation (EU) 910/2014 and LCEN, the electronic signature on this contract has full legal validity in France and throughout the European Union.",
    },
    phonePrefix: "+33",
    taxName: "TVA (VAT)",
    taxRate: 0.20,
  },

  // ── China ──────────────────────────────────────────────────────────────────
  {
    code: "CN",
    name: "China",
    nameEn: "China",
    flag: "🇨🇳",
    currency: "CNY",
    currencySymbol: "¥",
    currencyName: "Yuan Chino (Renminbi)",
    currencyNameEn: "Chinese Yuan (Renminbi)",
    locale: "zh-CN",
    stripeCurrency: "cny",
    stripeSupported: false, // Stripe no opera en China continental
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (China)",
      titleEn: "Legal Validity — Electronic Signature (China)",
      laws: [
        "Ley de Firma Electrónica de la RPC (2004, rev. 2019)",
        "Ley de Ciberseguridad de la RPC (2017)",
        "Ley de Protección de Información Personal (PIPL, 2021)",
      ],
      lawsEn: [
        "PRC Electronic Signature Law (2004, rev. 2019)",
        "PRC Cybersecurity Law (2017)",
        "Personal Information Protection Law (PIPL, 2021)",
      ],
      description:
        "De conformidad con la Ley de Firma Electrónica de la República Popular China (2004, revisada 2019), la firma electrónica en este contrato tiene validez jurídica en China.",
      descriptionEn:
        "Pursuant to the PRC Electronic Signature Law (2004, revised 2019), the electronic signature on this contract has legal validity in China.",
    },
    phonePrefix: "+86",
    taxName: "VAT (增值税)",
    taxRate: 0.13,
  },

  // ── Japón ──────────────────────────────────────────────────────────────────
  {
    code: "JP",
    name: "Japón",
    nameEn: "Japan",
    flag: "🇯🇵",
    currency: "JPY",
    currencySymbol: "¥",
    currencyName: "Yenes Japoneses",
    currencyNameEn: "Japanese Yen",
    locale: "ja-JP",
    stripeCurrency: "jpy",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Japón)",
      titleEn: "Legal Validity — Electronic Signature (Japan)",
      laws: [
        "Ley de Firma Electrónica y Servicios de Certificación (2000)",
        "Ley de Protección de Información Personal (APPI, 2003)",
      ],
      lawsEn: [
        "Electronic Signature and Certification Business Act (2000)",
        "Act on the Protection of Personal Information (APPI, 2003)",
      ],
      description:
        "De conformidad con la Ley de Firma Electrónica y Servicios de Certificación de Japón (2000), la firma electrónica en este contrato tiene plena validez jurídica en Japón.",
      descriptionEn:
        "Pursuant to Japan's Electronic Signature and Certification Business Act (2000), the electronic signature on this contract has full legal validity in Japan.",
    },
    phonePrefix: "+81",
    taxName: "Consumption Tax",
    taxRate: 0.10,
  },

  // ── Australia ──────────────────────────────────────────────────────────────
  {
    code: "AU",
    name: "Australia",
    nameEn: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    currencySymbol: "$",
    currencyName: "Dólares Australianos",
    currencyNameEn: "Australian Dollars",
    locale: "en-AU",
    stripeCurrency: "aud",
    stripeSupported: true,
    legalFramework: {
      title: "Validez Legal — Firma Electrónica (Australia)",
      titleEn: "Legal Validity — Electronic Signature (Australia)",
      laws: [
        "Electronic Transactions Act 1999 (Commonwealth)",
        "Privacy Act 1988",
        "Australian Privacy Principles (APPs)",
      ],
      lawsEn: [
        "Electronic Transactions Act 1999 (Commonwealth)",
        "Privacy Act 1988",
        "Australian Privacy Principles (APPs)",
      ],
      description:
        "De conformidad con la Electronic Transactions Act 1999, la firma electrónica en este contrato tiene plena validez jurídica en Australia.",
      descriptionEn:
        "Pursuant to the Electronic Transactions Act 1999, the electronic signature on this contract has full legal validity in Australia.",
    },
    phonePrefix: "+61",
    taxName: "GST",
    taxRate: 0.10,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCountryByCode(code: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getCountryByCurrency(currency: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.currency === currency);
}

export function getDefaultCountry(): CountryConfig {
  return COUNTRIES.find(c => c.code === "MX")!;
}

// Monedas únicas soportadas por Stripe
export const STRIPE_SUPPORTED_CURRENCIES = COUNTRIES
  .filter(c => c.stripeSupported)
  .reduce((acc, c) => {
    if (!acc.find(x => x.currency === c.currency)) {
      acc.push({ currency: c.currency, symbol: c.currencySymbol, name: c.currencyName, nameEn: c.currencyNameEn, stripeCurrency: c.stripeCurrency });
    }
    return acc;
  }, [] as { currency: string; symbol: string; name: string; nameEn: string; stripeCurrency: string }[]);

// Países prioritarios para el selector (los más usados primero)
export const PRIORITY_COUNTRIES = ["MX", "US", "CA", "ES", "CO", "AR", "BR", "CL", "PE", "GB", "DE", "FR", "AU", "JP"];

export function getSortedCountries(): CountryConfig[] {
  const priority = PRIORITY_COUNTRIES;
  return [
    ...priority.map(code => COUNTRIES.find(c => c.code === code)!).filter(Boolean),
    ...COUNTRIES.filter(c => !priority.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

// Formatear monto con la moneda del país
export function formatAmount(amount: number, country: CountryConfig): string {
  try {
    return new Intl.NumberFormat(country.locale, {
      style: "currency",
      currency: country.currency,
      minimumFractionDigits: country.currency === "JPY" || country.currency === "CLP" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${country.currencySymbol}${amount.toFixed(2)}`;
  }
}
