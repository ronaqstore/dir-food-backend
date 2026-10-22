import { config as loadEnv } from 'dotenv';
loadEnv({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
loadEnv({ path: '.env' });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

interface VariantDef {
  name: string;
  priceInRs: number;
}

interface ItemDef {
  name: string;
  description?: string;
  basePriceInRs?: number;
  variants?: VariantDef[];
}

interface CategoryDef {
  name: string;
  items: ItemDef[];
}

const CATALOG_DATA: CategoryDef[] = [
  // ---------------------------------------------------------------------------
  // 1. Specialities & Karahi
  // ---------------------------------------------------------------------------
  {
    name: 'Specialities & Karahi | کڑاہی اسپیشل',
    items: [
      {
        name: 'Shanwari Special Sulemani Karahi | شنواری سلیمانی کڑاہی',
        description: 'Tender mutton cooked in pure sheep fat with tomatoes and green chilies. Pure tribal authentic taste.',
        basePriceInRs: 1700,
      },
      {
        name: 'Mutton Namkeen Karahi | مٹن نمکین کڑاہی',
        description: 'Traditional slow-cooked salted mutton prepared with minimal spices and organic fat.',
        variants: [
          { name: 'Half', priceInRs: 1700 },
          { name: 'Full', priceInRs: 3400 },
        ],
      },
      {
        name: 'Dumba Karahi | دنبہ کڑاہی',
        description: 'Prime cut local Dumba meat cooked in iron karahi over high flame.',
        basePriceInRs: 2000,
      },
      {
        name: 'Chicken White Karahi | چکن وائٹ کڑاہی',
        description: 'Rich and creamy chicken karahi with fresh cream, yogurt, white pepper, and green chilies.',
        variants: [
          { name: 'Half', priceInRs: 1100 },
          { name: 'Full', priceInRs: 2100 },
        ],
      },
      {
        name: 'Chicken Makhni Karahi | چکن مکھنی کڑاہی',
        description: 'Prepared in fresh dairy butter with mild spices, ginger julienne, and thick velvety gravy.',
        variants: [
          { name: 'Half', priceInRs: 1000 },
          { name: 'Full', priceInRs: 1900 },
        ],
      },
      {
        name: 'Chicken Achari Karahi | چکن اچاری کڑاہی',
        description: 'Tangy and aromatic chicken karahi infused with traditional pickled spices.',
        variants: [
          { name: 'Half', priceInRs: 1100 },
          { name: 'Full', priceInRs: 2100 },
        ],
      },
      {
        name: 'Chicken Sikh Kabab Karahi | چکن سیخ کباب کڑاہی',
        description: 'Charcoal grilled chicken seekh kababs simmered in a spiced tomato-onion masala gravy.',
        variants: [
          { name: 'Half', priceInRs: 600 },
          { name: 'Full', priceInRs: 1050 },
        ],
      },
      {
        name: 'Beef Sikh Kabab Karahi | بیف سیخ کباب کڑاہی',
        description: 'Smoky beef seekh kababs tossed with fresh green chilies and tangy tomato gravy.',
        variants: [
          { name: 'Half', priceInRs: 700 },
          { name: 'Full', priceInRs: 1300 },
        ],
      },
      {
        name: 'Chicken Handi | چکن ہانڈی',
        description: 'Boneless chicken cubes cooked in a clay handi with rich almond and cream gravy.',
        variants: [
          { name: 'Half', priceInRs: 1050 },
          { name: 'Full', priceInRs: 2050 },
        ],
      },
      {
        name: 'Chicken Mughlai Karahi | چکن مغلائی کڑاہی',
        description: 'Royal Mughlai style chicken karahi with boiled eggs, cashews, and rich saffron aroma.',
        variants: [
          { name: 'Half', priceInRs: 1100 },
          { name: 'Full', priceInRs: 2200 },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Shinwari & Desi Cuisine
  // ---------------------------------------------------------------------------
  {
    name: 'Shinwari & Desi Cuisine | شنواری اور دیسی کھانے',
    items: [
      {
        name: 'Namkeen Gosht | نمکین گوشت',
        description: 'Classic KPK Peshawari mutton slow-cooked in natural fat with sea salt and garlic.',
        basePriceInRs: 700,
      },
      {
        name: 'Sobat (Painda) Chicken | چکن ثوبت / پیندا',
        description: 'Traditional Marwat/Bannu specialty with shredded paratha soaked in aromatic chicken soup.',
        basePriceInRs: 800,
      },
      {
        name: 'Special Beef Sobat | اسپیشل بیف ثوبت',
        description: 'Hearty traditional Painda served in a large clay platter with tender spiced beef pieces.',
        basePriceInRs: 1600,
      },
      {
        name: 'Mutton Sobat Platter | مٹن ثوبت پلیٹر',
        description: 'Authentic desi mutton Painda soaked in slow-simmered shorba, served with fresh onions and lemons.',
        basePriceInRs: 2200,
      },
      {
        name: 'Daal Mash (Desi Ghee) | دال ماش دیسی گھی',
        description: 'White lentil cooked to tender perfection and tempered with pure organic desi ghee and cumin.',
        basePriceInRs: 400,
      },
      {
        name: 'Daal Chana Fry | دال چنا فرائی',
        description: 'Spiced split gram lentil stir-fried with tomatoes, garlic, ginger, and fresh coriander.',
        basePriceInRs: 250,
      },
      {
        name: 'Aloo Keema Masala | آلو قیمہ',
        description: 'Minced beef cooked with diced potatoes, whole spices, and garnished with ginger strips.',
        basePriceInRs: 300,
      },
      {
        name: 'Chicken Qorma | چکن قورمہ',
        description: 'Traditional Shahi style chicken curry prepared with fried onions and whole aromatics.',
        variants: [
          { name: 'Half', priceInRs: 1000 },
          { name: 'Full', priceInRs: 1900 },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Bar B.Q & Kababs
  // ---------------------------------------------------------------------------
  {
    name: 'Bar B.Q & Kababs | باربی کیو اور کباب',
    items: [
      {
        name: 'Zaiqa Special Platter | ذائقہ اسپیشل پلیٹر',
        description: 'Assortment of Mutton Tikka, Malai Boti, Seekh Kabab, Fish Tikka, and Naan with chutneys.',
        variants: [
          { name: 'Half', priceInRs: 5250 },
          { name: 'Full', priceInRs: 7750 },
        ],
      },
      {
        name: 'Bar BQ Angeethi Platter | باربی کیو انگیٹھی پلیٹر',
        description: 'Tabletop live charcoal grill with mixed kebabs, boti skewers, and charcoal roasted vegetables.',
        variants: [
          { name: 'Regular', priceInRs: 5000 },
          { name: 'Large', priceInRs: 7500 },
        ],
      },
      {
        name: 'Mutton Tikka (Charcoal) | مٹن تکہ',
        description: 'Succulent mutton cubes marinated in salt and animal fat, grilled over open coals.',
        basePriceInRs: 3400,
      },
      {
        name: 'Beef Champ Roast | بیف چانپ',
        description: 'Prime beef ribs spiced with pomegranate seeds and crushed black pepper, slow charcoal grilled.',
        basePriceInRs: 2200,
      },
      {
        name: 'Chicken Malai Boti | چکن ملائی بوٹی',
        description: 'Tender chicken breast boneless skewers marinated in fresh cream, green cardamom, and mild cheese.',
        basePriceInRs: 1000,
      },
      {
        name: 'Chicken Tikka Piece | چکن تکہ',
        description: 'Crispy charcoal grilled quarter chicken (Leg or Breast) with spicy Lahori tandoori rub.',
        variants: [
          { name: 'Leg Piece', priceInRs: 500 },
          { name: 'Breast Piece', priceInRs: 550 },
        ],
      },
      {
        name: 'Beef Seekh Kabab Plate | سیخ کباب پلیٹ',
        description: '4 skewers of juicy hand-minced beef kebabs blended with coriander, mint, and raw spices.',
        basePriceInRs: 700,
      },
      {
        name: 'Chapli Kabab Sada | چپلی کباب سادہ',
        description: 'Famous Khyber style shallow fried minced patty with coriander seeds, onions, and tomatoes.',
        basePriceInRs: 100,
      },
      {
        name: 'Chapli Kabab Ande Wala | چپلی کباب انڈے والا',
        description: 'Peshawari chapli kabab fried with an organic beaten egg on top for rich crispy texture.',
        basePriceInRs: 150,
      },
      {
        name: 'Chapli Kabab Nali Wala | چپلی کباب نلی والا',
        description: 'Juicy chapli kabab crowned with rich bone marrow (Nali) butter.',
        basePriceInRs: 200,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. Rice & Pulao
  // ---------------------------------------------------------------------------
  {
    name: 'Rice & Pulao | چاول اور بریانی',
    items: [
      {
        name: 'Kabuli Pulao Plate | کابلی پلاؤ پلیٹ',
        description: 'Fragrant long-grain sella basmati with raisins, caramelized carrot shreds, and tender beef chunk.',
        basePriceInRs: 300,
      },
      {
        name: 'Chicken Pulao | چکن پلاؤ',
        description: 'Traditional light spiced rice cooked in seasoned chicken broth with tender chicken pieces.',
        basePriceInRs: 280,
      },
      {
        name: 'Sada Pulao Rice | سادہ پلاؤ',
        description: 'Steamed fragrant basmati pulao rice served with raita.',
        basePriceInRs: 180,
      },
      {
        name: 'Hyderabadi Chicken Biryani | حیدرآبادی چکن بریانی',
        description: 'Aromatic layered dum biryani cooked with chicken masala, mint, plums, and fried onions.',
        variants: [
          { name: 'Single', priceInRs: 600 },
          { name: 'Full Plate', priceInRs: 750 },
        ],
      },
      {
        name: 'Afghani Special Pulao | افغانی پلاؤ',
        description: 'Traditional Afghan recipe featuring dry fruits, nuts, and juicy mutton shank.',
        variants: [
          { name: 'Half', priceInRs: 600 },
          { name: 'Full', priceInRs: 750 },
        ],
      },
      {
        name: 'Chinese Fried Rice | چائنیز فرائیڈ رائس',
        description: 'Wok tossed rice with spring onions, scrambled egg, carrots, and light soy sauce.',
        basePriceInRs: 700,
      },
      {
        name: 'Egg Fried Rice | ایگ فرائیڈ رائس',
        description: 'Fluffy steamed basmati tossed in wok with farm fresh eggs and white pepper.',
        basePriceInRs: 1299,
      },
      {
        name: 'Vegetable Fried Rice | سبزی فرائیڈ رائس',
        description: 'Fresh seasonal vegetables wok tossed with fragrant basmati and toasted sesame.',
        basePriceInRs: 1099,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Special Ziqa Pizza
  // ---------------------------------------------------------------------------
  {
    name: 'Special Ziqa Pizza | اسپیشل ذائقہ پیزا',
    items: [
      {
        name: 'Chicken Tikka Pizza | چکن تکہ پیزا',
        description: 'Topped with spicy smoked chicken tikka chunks, mozzarella cheese, onions, and pizza sauce.',
        variants: [
          { name: 'Small (8")', priceInRs: 950 },
          { name: 'Medium (11")', priceInRs: 1300 },
          { name: 'Large (13")', priceInRs: 1800 },
        ],
      },
      {
        name: 'Chicken Fajita Pizza | چکن فجیتا پیزا',
        description: 'Marinated Mexican fajita chicken, bell peppers, sweet corn, black olives, and melted cheese.',
        variants: [
          { name: 'Small (8")', priceInRs: 950 },
          { name: 'Medium (11")', priceInRs: 1300 },
          { name: 'Large (13")', priceInRs: 1800 },
        ],
      },
      {
        name: 'Chicken Cheese Gold Pizza | چکن چیز گولڈ پیزا',
        description: 'Double layer mozzarella and cheddar with stuffed crust and rich garlic herb chicken.',
        variants: [
          { name: 'Small (8")', priceInRs: 1200 },
          { name: 'Medium (11")', priceInRs: 1400 },
          { name: 'Large (13")', priceInRs: 2000 },
        ],
      },
      {
        name: 'Hot & Spicy Pizza | ہاٹ اینڈ اسپائسی پیزا',
        description: 'Fiery peri peri chicken, jalapeños, red onions, mushrooms, and spicy secret sauce.',
        variants: [
          { name: 'Small (8")', priceInRs: 900 },
          { name: 'Medium (11")', priceInRs: 1300 },
          { name: 'Large (13")', priceInRs: 1800 },
        ],
      },
      {
        name: 'Tandoori Pizza | تندوری پیزا',
        description: 'Authentic smoky tandoori chicken chunks, green chilies, tomatoes, and golden mozzarella.',
        variants: [
          { name: 'Small (8")', priceInRs: 900 },
          { name: 'Medium (11")', priceInRs: 1300 },
          { name: 'Large (13")', priceInRs: 1800 },
        ],
      },
      {
        name: 'Zaiqa Special Pizza | ذائقہ اسپیشل پیزا',
        description: 'Loaded with smoked sausages, chicken tikka, beef pepperoni, mushrooms, olives, and extra cheese.',
        variants: [
          { name: 'Small (8")', priceInRs: 1000 },
          { name: 'Medium (11")', priceInRs: 1350 },
          { name: 'Large (13")', priceInRs: 1950 },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. Fast Food & Burgers
  // ---------------------------------------------------------------------------
  {
    name: 'Fast Food & Burgers | فاسٹ فوڈ اور برگرز',
    items: [
      {
        name: 'Crispy Broast | کرسپی بروسٹ',
        description: 'Golden crispy batter-fried chicken served with garlic sauce, fresh fries, and dinner roll.',
        variants: [
          { name: 'Half (4 Pcs)', priceInRs: 1000 },
          { name: 'Full (8 Pcs)', priceInRs: 2000 },
        ],
      },
      {
        name: 'Crispy Zinger Burger | کرسپی زنگر برگر',
        description: 'Crispy whole fried chicken fillet with iceberg lettuce and secret mayo in toasted sesame bun.',
        basePriceInRs: 500,
      },
      {
        name: 'Crispy Zinger Cheese Burger | زنگر چیز برگر',
        description: 'Crunchy zinger fillet with melted cheddar cheese slice, chipotle sauce, and lettuce.',
        basePriceInRs: 550,
      },
      {
        name: 'Zaiqa Special Double Zinger | ڈبل زنگر برگر',
        description: 'Double crunchy chicken patties stacked with double cheese, turkey slice, and spicy sauce.',
        basePriceInRs: 650,
      },
      {
        name: 'Crispy Fish Zinger Burger | فش زنگر برگر',
        description: 'Crisp coated ocean fish fillet with tartar sauce and fresh lettuce.',
        basePriceInRs: 700,
      },
      {
        name: 'Beef Burger (Classic) | بیف برگر',
        description: 'Grilled minced beef patty with caramelized onions, pickles, and creamy mustard mayo.',
        basePriceInRs: 350,
      },
      {
        name: 'Chicken Shawarma | چکن شاورما',
        description: 'Thinly sliced spit-roasted marinated chicken wrapped in pita bread with garlic tahini.',
        basePriceInRs: 250,
      },
      {
        name: 'Chicken Cheese Shawarma | چکن چیز شاورما',
        description: 'Jumbo chicken shawarma with melted mozzarella, pickles, and signature white garlic sauce.',
        basePriceInRs: 300,
      },
      {
        name: 'Club Sandwich | کلب سینڈوچ',
        description: 'Triple layer toasted sandwich with shredded chicken, fried egg, cheese, and crunchy veggies.',
        basePriceInRs: 550,
      },
      {
        name: 'French Fries | فرینچ فرائز',
        description: 'Crisp salted golden potato fries with garlic mayo dip.',
        variants: [
          { name: 'Regular', priceInRs: 150 },
          { name: 'Large', priceInRs: 300 },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. Steaks & Continental
  // ---------------------------------------------------------------------------
  {
    name: 'Steaks & Continental | اسٹیکس اور کانٹینینٹل',
    items: [
      {
        name: 'Grilled Chicken Steak | گرل چکن اسٹیک',
        description: 'Tender grilled chicken breast served with sautéed vegetables, mashed potatoes, and brown sauce.',
        basePriceInRs: 1899,
      },
      {
        name: 'Tenderloin Beef Steak | ٹینڈرلوئن بیف اسٹیک',
        description: 'Charbroiled prime beef tenderloin served on a sizzling platter with choice of pepper sauce.',
        basePriceInRs: 2799,
      },
      {
        name: 'Fettuccine Alfredo Pasta | الفریڈو پاستا',
        description: 'Classic Italian fettuccine tossed in rich parmesan butter cream sauce with grilled chicken.',
        basePriceInRs: 1950,
      },
      {
        name: 'Dynamite Prawns | ڈائنامائٹ پرانز',
        description: 'Crispy fried jumbo prawns tossed in sweet and spicy dynamite sauce.',
        basePriceInRs: 2599,
      },
      {
        name: 'Dynamite Chicken Bites | ڈائنامائٹ چکن',
        description: 'Golden crispy chicken cubes coated in spicy cream dynamite dressing.',
        basePriceInRs: 1660,
      },
      {
        name: 'Honey Spicy Wings | ہنی اسپائسی ونگز',
        description: 'Crispy fried chicken wings glazed with honey sriracha sauce and toasted sesame seeds.',
        basePriceInRs: 1489,
      },
      {
        name: 'Fish & Chips | فش اینڈ چپس',
        description: 'Golden battered fish fillets served with steak-cut fries and homemade tartar sauce.',
        basePriceInRs: 2119,
      },
      {
        name: 'Garlic Mayo Masala Fries | گارلک مایو فرائز',
        description: 'Crispy potato fries loaded with spicy chaat masala and creamy garlic mayo drizzle.',
        basePriceInRs: 599,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. Chinese & Hot Soups
  // ---------------------------------------------------------------------------
  {
    name: 'Chinese & Hot Soups | چائنیز اور گرم سوپ',
    items: [
      {
        name: 'Chicken Corn Soup | چکن کارن سوپ',
        description: 'Velvety soup with sweet corn kernels, shredded chicken, and egg ribbons.',
        variants: [
          { name: 'Single Bowl', priceInRs: 295 },
          { name: 'Family Bowl', priceInRs: 495 },
        ],
      },
      {
        name: 'Hot & Sour Soup | ہاٹ اینڈ سور سوپ',
        description: 'Spicy and tangy broth with chicken, wood ear mushrooms, tofu, and vinegar.',
        variants: [
          { name: 'Single Bowl', priceInRs: 349 },
          { name: 'Family Bowl', priceInRs: 649 },
        ],
      },
      {
        name: 'Zaiqa Special Soup | ذائقہ اسپیشل سوپ',
        description: 'Chef signature soup loaded with prawns, chicken chunks, button mushrooms, and sweet corn.',
        variants: [
          { name: 'Single Bowl', priceInRs: 395 },
          { name: 'Family Bowl', priceInRs: 695 },
        ],
      },
      {
        name: 'Chicken Manchurian | چکن منچورین',
        description: 'Crispy chicken bites cooked in traditional red garlic tomato sweet and sour sauce.',
        basePriceInRs: 1689,
      },
      {
        name: 'Chicken Chili Dry | چکن چلی ڈرائی',
        description: 'Stir-fried chicken slices with fresh green chilies, ginger, and savory dark soy sauce.',
        basePriceInRs: 1999,
      },
      {
        name: 'Beef Chili Dry | بیف چلی ڈرائی',
        description: 'Tender marinated beef undercut strips sautéed on high wok heat with green chilies.',
        basePriceInRs: 1999,
      },
      {
        name: 'Chicken Chowmein | چکن چومین',
        description: 'Handmade noodles tossed with shredded chicken, crunchy cabbage, carrots, and scallions.',
        basePriceInRs: 1399,
      },
      {
        name: 'Chicken Shashlik with Rice | چکن شاشلک',
        description: 'Skewered chicken and vegetables in tangy tomato glaze served with egg fried rice.',
        basePriceInRs: 1100,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 9. Fish & Seafood
  // ---------------------------------------------------------------------------
  {
    name: 'Fish & Seafood | مچھلی اور سی فوڈ',
    items: [
      {
        name: 'Siman Fish (Fried / Karahi) | سیمن مچھلی',
        description: 'Fresh river Siman fish marinated in ajwain and lemon, fried crisp or cooked as karahi.',
        variants: [
          { name: '1/2 kg', priceInRs: 550 },
          { name: '1 kg', priceInRs: 1100 },
        ],
      },
      {
        name: 'Mushka Fish | مشکا مچھلی',
        description: 'Boneless sweet white fish cooked with garlic, tandoori masala, and dry fenugreek.',
        variants: [
          { name: '1/2 kg', priceInRs: 600 },
          { name: '1 kg', priceInRs: 1000 },
        ],
      },
      {
        name: 'Silverfish | سلور فش',
        description: 'Crisp battered river fish deep fried to golden perfection with special spice dip.',
        variants: [
          { name: '1/2 kg', priceInRs: 400 },
          { name: '1 kg', priceInRs: 700 },
        ],
      },
      {
        name: 'Rahu Fish | راہو مچھلی',
        description: 'Traditional Punjabi style spiced Rahu fish, shallow fried with crispy edges.',
        variants: [
          { name: '1/2 kg', priceInRs: 450 },
          { name: '1 kg', priceInRs: 800 },
        ],
      },
      {
        name: 'Trout Grill Fish | ٹراؤٹ گرل فش',
        description: 'Dir Valley fresh mountain trout whole fish, marinated in lemon herb butter and grilled.',
        basePriceInRs: 1800,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 10. Tandoor & Fresh Naan
  // ---------------------------------------------------------------------------
  {
    name: 'Tandoor & Fresh Naan | تندور اور نان',
    items: [
      {
        name: 'Roghni Naan | روغنی نان',
        description: 'Fluffy clay oven naan brushed with butter and sprinkled with sesame seeds.',
        basePriceInRs: 30,
      },
      {
        name: 'Sada Naan | سادہ نان',
        description: 'Traditional hot tandoori plain naan.',
        basePriceInRs: 25,
      },
      {
        name: 'Kulcha Til Wala | تل والا کلچہ',
        description: 'Crispy Punjabi kulcha bread coated with white sesame seeds.',
        basePriceInRs: 30,
      },
      {
        name: 'Kalwanji Naan | کلونجی نان',
        description: 'Clay-oven baked naan adorned with black seed (Nigella / Kalwanji).',
        basePriceInRs: 35,
      },
      {
        name: 'Peshawri Naan | پشاوری نان',
        description: 'Soft tandoori bread prepared in the authentic Khyber Peshawari style.',
        basePriceInRs: 30,
      },
      {
        name: 'Garlic Cheese Naan | گارلک چیز نان',
        description: 'Stuffed with melted mozzarella and topped with toasted minced garlic and butter.',
        basePriceInRs: 150,
      },
      {
        name: 'Saada Roti | سادہ روٹی / چپاتی',
        description: 'Whole wheat tandoori roti fresh off the clay wall.',
        basePriceInRs: 15,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 11. Quetta Breakfast & Paratha
  // ---------------------------------------------------------------------------
  {
    name: 'Quetta Breakfast & Paratha | کوئٹہ ناشتہ اور پراٹھا',
    items: [
      {
        name: 'Sada Paratha | سادہ پراٹھا',
        description: 'Golden, crispy, multi-layered tawa paratha made with pure ghee.',
        basePriceInRs: 70,
      },
      {
        name: 'Lachedar Paratha | لچھے دار پراٹھا',
        description: 'Extra crispy spiral layered paratha prepared in authentic Quetta hotel style.',
        basePriceInRs: 80,
      },
      {
        name: 'Malai Paratha | ملائی پراٹھا',
        description: 'Soft flaky paratha stuffed with fresh clotted dairy malai.',
        basePriceInRs: 150,
      },
      {
        name: 'Aloo Paratha | آلو والا پراٹھا',
        description: 'Paratha stuffed with spiced mashed potatoes, green chilies, and roasted coriander.',
        basePriceInRs: 120,
      },
      {
        name: 'Anda Half Fry | انڈہ ہاف فرائی',
        description: 'Sunny-side-up organic egg cooked in desi butter with salt and black pepper.',
        basePriceInRs: 60,
      },
      {
        name: 'Pakistani Omelette | انڈہ آملیٹ',
        description: 'Fluffy omelette with finely diced onions, green chilies, tomatoes, and fresh coriander.',
        basePriceInRs: 70,
      },
      {
        name: 'Chana Plate (Breakfast) | چنا پلیٹ',
        description: 'Slow-simmered chickpea curry seasoned with black pepper and cumin.',
        variants: [
          { name: 'Single', priceInRs: 120 },
          { name: 'Double', priceInRs: 150 },
        ],
      },
      {
        name: 'Halwa Puri Plate | حلوہ پوری ناشتہ',
        description: '2 hot crispy puris served with traditional sooji halwa and spicy chana tarkari.',
        basePriceInRs: 200,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 12. Quetta Chai & Hot Drinks
  // ---------------------------------------------------------------------------
  {
    name: 'Quetta Chai & Hot Drinks | کوئٹہ چائے اور قہوہ',
    items: [
      {
        name: 'Special Doodh Patti | اسپیشل دودھ پتی',
        description: 'Thick, creamy, full-boiled tea made purely with fresh buffalo milk and premium tea leaves.',
        basePriceInRs: 90,
      },
      {
        name: 'Doodh Patti Gurh | دودھ پتی گڑ والی',
        description: 'Rich slow-boiled milk tea sweetened with organic natural sugarcane gurh.',
        basePriceInRs: 100,
      },
      {
        name: 'Matka Chai Sada | مٹکا چائے سادہ',
        description: 'Aromatic piping-hot tea served in a traditional baked clay matka.',
        basePriceInRs: 130,
      },
      {
        name: 'Special Matka Pista Badam | اسپیشل مٹکا پستہ بادامی',
        description: 'Clay pot tea infused with crushed almonds, pistachios, and green cardamom.',
        basePriceInRs: 180,
      },
      {
        name: 'Matka Gurh Pista Badam | مٹکا گڑ پستہ بادامی',
        description: 'Clay pot organic jaggery tea packed with pistachios and slivered almonds.',
        basePriceInRs: 200,
      },
      {
        name: 'Peshawari Green Tea / Qehwa | قہوہ پشاوری',
        description: 'Digestive green tea brewed with green cardamom and lemon slices.',
        basePriceInRs: 50,
      },
      {
        name: 'Doodh Badami Chai | دودھ بادامی چائے',
        description: 'Rich milk tea loaded with blanched almond paste and saffron aroma.',
        basePriceInRs: 140,
      },
      {
        name: 'Kashmiri Pink Chai | کشمیری چائے',
        description: 'Traditional pink salted or sweet tea served with crushed pistachios and almonds.',
        basePriceInRs: 140,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 13. Cold Bar & Fresh Beverages
  // ---------------------------------------------------------------------------
  {
    name: 'Cold Bar & Beverages | مشروبات اور کولڈ ڈرنکس',
    items: [
      {
        name: 'Fresh Lime 7UP | فریش لیمن',
        description: 'Chilled 7UP with freshly squeezed lemon juice, black salt, and crushed ice.',
        basePriceInRs: 70,
      },
      {
        name: 'Mint Margarita | منٹ مارگریٹا',
        description: 'Crushed mint leaves, lemon juice, soda, and ice blended into a refreshing summer cooler.',
        basePriceInRs: 220,
      },
      {
        name: 'Soft Drink (Can 250ml) | سافٹ ڈرنک کین',
        description: 'Chilled canned soda (Pepsi, Coca Cola, 7UP, Mirinda, Mountain Dew).',
        basePriceInRs: 120,
      },
      {
        name: 'Regular Cold Drink (Glass Bottle) | ریگولر بوتل',
        description: '250ml retro glass bottle soda.',
        basePriceInRs: 60,
      },
      {
        name: 'Cold Drink 500ml Bottle | بوتل 500 ملی لیٹر',
        description: '500ml PET bottle soda.',
        basePriceInRs: 90,
      },
      {
        name: 'Cold Drink 1.5L Family Bottle | بوتل 1.5 لیٹر',
        description: '1.5 liter sharing size cold drink.',
        basePriceInRs: 190,
      },
      {
        name: 'Mineral Water | منرل واٹر',
        description: 'Purified sealed drinking mineral water.',
        variants: [
          { name: 'Small (500ml)', priceInRs: 50 },
          { name: 'Large (1.5L)', priceInRs: 70 },
        ],
      },
      {
        name: 'Sting Energy Drink | اسٹنگ انرجی ڈرنک',
        description: 'Chilled berry blast energy drink.',
        variants: [
          { name: 'Regular Bottle', priceInRs: 35 },
          { name: '500ml Bottle', priceInRs: 80 },
        ],
      },
      {
        name: 'Peshawari Lassi (Sweet / Salty) | پشاوری لسی',
        description: 'Thick churned fresh yogurt lassi topped with fresh clotted malai.',
        variants: [
          { name: 'Single Glass', priceInRs: 120 },
          { name: 'Large Jug (Sharing)', priceInRs: 300 },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 14. Ice Cream & Shakes
  // ---------------------------------------------------------------------------
  {
    name: 'Ice Cream & Shakes | آئس کریم اور شیک',
    items: [
      {
        name: 'Ice Cream Scoop (Single / Double) | آئس کریم',
        description: 'Creamy dairy ice cream. Available in Vanilla, Strawberry, Chocolate, Pista, Tutti Fruiti, Kulfa, and Mango.',
        variants: [
          { name: 'Single Scoop', priceInRs: 120 },
          { name: 'Double Scoop', priceInRs: 200 },
        ],
      },
      {
        name: 'Hujra Special Sundae | حجرہ اسپیشل سنڈے',
        description: 'Triple scoops of assorted ice creams with brownies, chocolate syrup, and toasted cashew nuts.',
        basePriceInRs: 220,
      },
      {
        name: 'Oreo Thick Shake | اوریو شیک',
        description: 'Creamy blend of whole milk, vanilla ice cream, and crunchy Oreo cookies.',
        basePriceInRs: 300,
      },
      {
        name: 'Mango Ice Cream Shake | مینگو شیک',
        description: 'Fresh seasonal mango pulp blended with rich vanilla ice cream.',
        basePriceInRs: 300,
      },
      {
        name: 'Strawberry Ice Cream Shake | اسٹرابیری شیک',
        description: 'Sweet strawberry puree blended with rich dairy ice cream and milk.',
        basePriceInRs: 300,
      },
      {
        name: 'Chocolate Ice Cream Shake | چاکلیٹ شیک',
        description: 'Belgian cocoa and chocolate ice cream thick milkshake with chocolate drizzle.',
        basePriceInRs: 300,
      },
      {
        name: 'Kulfa Badam Shake | قلفہ بادام شیک',
        description: 'Traditional Punjabi kulfa ice cream blended with crushed almonds and pistachio.',
        basePriceInRs: 300,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 15. Traditional Sweets & Desserts
  // ---------------------------------------------------------------------------
  {
    name: 'Sweets & Desserts | میٹھا اور روایتی ڈیزرٹ',
    items: [
      {
        name: 'Shahi Kheer | شاہی کھیر',
        description: 'Slow-cooked fragrant rice pudding with thick milk, cardamom, and silver leaf.',
        basePriceInRs: 150,
      },
      {
        name: 'Gajar Ka Halwa (Desi Ghee) | گاجر کا حلوہ',
        description: 'Winter red carrots cooked with organic milk, pure desi ghee, and generous mawa khoya.',
        basePriceInRs: 250,
      },
      {
        name: 'Gulab Jamun Plate | گرم گلاب جامن',
        description: '2 warm melt-in-mouth milk solid dumplings dipped in rose-scented sugar syrup.',
        basePriceInRs: 120,
      },
      {
        name: 'Ras Malai (2 Pcs) | رس ملائی',
        description: 'Soft cottage cheese patties immersed in chilled clotted saffron cardamom milk.',
        basePriceInRs: 180,
      },
      {
        name: 'Shahi Matka Kulfi | شاہی مٹکا قلفی',
        description: 'Traditional slow-frozen condensed milk kulfi enriched with pistachios and kewra.',
        basePriceInRs: 150,
      },
      {
        name: 'Fruit Trifle | فروٹ ٹرائفل',
        description: 'Layers of moist vanilla sponge cake, fruit custard, mixed seasonal fruit, and jelly.',
        basePriceInRs: 200,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 16. Value Deals & Combos
  // ---------------------------------------------------------------------------
  {
    name: 'Value Deals & Combos | ڈیلز اور کومبوز',
    items: [
      {
        name: 'Family Deal 1 | فیملی ڈیل 1',
        description: '1 Large Pizza (any flavor) + 4 Pcs Crispy Chicken Broast + 2 Crispy Zinger Burgers + 2 Chicken Shawarma + 1 Large French Fries + 1 Cold Drink (2.5 Liter). Feeds 5-6 persons.',
        basePriceInRs: 3699,
      },
      {
        name: 'Student Deal 2 | اسٹوڈنٹ ڈیل 2',
        description: '1 Medium Pizza (11") + 2 Pcs Crispy Chicken + 1 Crispy Zinger Burger + 1 Chicken Shawarma + 1 Regular Fries + 1 Cold Drink (1.5 Liter). Perfect for 3 students.',
        basePriceInRs: 2299,
      },
      {
        name: 'Friends Deal 3 | فرینڈز ڈیل 3',
        description: '1 Small Pizza (8") + 1 Crispy Zinger Burger + 1 Chicken Shawarma + 1 Regular Fries + 1 Regular Cold Drink. Feeds 2 persons.',
        basePriceInRs: 1499,
      },
      {
        name: 'Zaiqa Special Deal 4 | ذائقہ اسپیشل ڈیل 4',
        description: '1 Large Pizza + 4 Pcs Crispy Chicken + 2 Crispy Zinger Burgers + 2 Paratha Rolls + 1 Large Fries + 1 Cold Drink (2.5 Liter).',
        basePriceInRs: 3899,
      },
      {
        name: 'BBQ Lovers Combo | باربی کیو لورز کومبو',
        description: '1 Half Mutton Karahi + 4 Beef Seekh Kababs + 1 Chicken Tikka Chest + 4 Roghni Naans + Raita & Salad + 1.5L Drink.',
        basePriceInRs: 3200,
      },
      {
        name: 'Burger & Shawarma Box | برگر اینڈ شاورما باکس',
        description: '2 Zinger Burgers + 2 Chicken Shawarmas + 1 Jumbo Masala Fries + 2 Cold Drinks.',
        basePriceInRs: 1250,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 17. Ramadan & Party Buffets
  // ---------------------------------------------------------------------------
  {
    name: 'Buffet & Packages | بوفے اور پارٹی پیکیجز',
    items: [
      {
        name: 'TKR Style Ramadan Iftar & Dinner Buffet | افطار و ڈنر بوفے',
        description: 'All-inclusive buffet per head. Includes Dates, Pakora, Samosa, Soup, Salad Bar, Chat Corner, Biryani, Karahi, Rosh, Chapli & Seekh Kabab, Naans, Kheer, Gulab Jamun, and Drinks.',
        basePriceInRs: 3299,
      },
      {
        name: 'Executive Hi-Tea Buffet (Per Head) | ہائی ٹی بوفے',
        description: 'Over 40 items including Mini Burgers, Pastas, Chicken Wings, Spring Rolls, Finger Fish, Assorted Sandwiches, Mini Pizzas, Pastries, and Unlimited Tea & Coffee.',
        basePriceInRs: 1650,
      },
      {
        name: 'Royal Dawat Platter (10-12 Persons) | شاہی دعوت پلیٹر',
        description: 'Whole Lamb Raan Roast + 2 Full Mutton Karahi + 2 Full Chicken White Karahi + 1 Large Pulao Platter + 20 Naans + Mixed Sweets Box.',
        basePriceInRs: 28000,
      },
    ],
  },
];

function getDishImage(itemName: string, categoryName: string): string {
  const lower = itemName.toLowerCase();
  const catLower = categoryName.toLowerCase();

  if (lower.includes('white karahi') || lower.includes('makhni') || lower.includes('handi')) {
    return 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('karahi')) {
    return 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('platter') || lower.includes('angeethi')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('tikka') || lower.includes('boti')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('kabab') || lower.includes('seekh') || lower.includes('chapli')) {
    return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('namkeen gosht') || lower.includes('champ') || lower.includes('dumba') || lower.includes('mutton')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('pulao') || lower.includes('biryani') || lower.includes('rice')) {
    if (lower.includes('fried rice') || lower.includes('chinese')) {
      return 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=500&q=80';
    }
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('pizza')) {
    if (lower.includes('cheese')) {
      return 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=80';
    }
    if (lower.includes('spicy') || lower.includes('peri') || lower.includes('tandoori')) {
      return 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=500&q=80';
    }
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('broast') || lower.includes('crispy chicken') || lower.includes('wings')) {
    return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('burger') || lower.includes('zinger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('shawarma')) {
    return 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('sandwich')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('fries')) {
    return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('steak')) {
    return 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('pasta') || lower.includes('alfredo') || lower.includes('chowmein')) {
    return 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('prawn') || lower.includes('fish') || lower.includes('seafood') || catLower.includes('fish')) {
    return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('soup') || catLower.includes('soup')) {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('manchurian') || lower.includes('chili dry') || lower.includes('shashlik')) {
    return 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('naan') || lower.includes('roti') || lower.includes('kulcha') || catLower.includes('tandoor')) {
    return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('paratha')) {
    return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('anda') || lower.includes('egg') || lower.includes('omelette')) {
    return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('chana') || lower.includes('daal') || lower.includes('halwa puri')) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('doodh patti') || lower.includes('chai') || lower.includes('matka')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('pink') || lower.includes('kashmiri')) {
    return 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('qehwa') || lower.includes('green tea')) {
    return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('margarita') || lower.includes('fresh lime') || lower.includes('lemon')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('shake') || lower.includes('sundae')) {
    return 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('ice cream') || lower.includes('scoop') || lower.includes('kulfi')) {
    return 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('drink') || lower.includes('bottle') || lower.includes('can') || lower.includes('sting') || lower.includes('water')) {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('lassi')) {
    return 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('kheer') || lower.includes('halwa') || lower.includes('gulab jamun') || lower.includes('ras malai') || lower.includes('trifle') || catLower.includes('dessert') || catLower.includes('sweet')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('buffet') || catLower.includes('buffet')) {
    return 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=500&q=80';
  }
  if (lower.includes('deal') || lower.includes('combo') || catLower.includes('deal')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80';
  }

  return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80';
}

async function seedMenu() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: dbUrl,
    connectionTimeoutMillis: 15_000,
  });
  const prisma = new PrismaClient({ adapter });

  console.log('\n--- Seeding 100+ Menu Items into Zaiqa Mahal & River Restaurant ---');

  // 1. Locate or Update Restaurant
  // We check for existing restaurant (either slug dukan-pro or first restaurant)
  let restaurant = await prisma.restaurant.findFirst({
    where: {
      OR: [{ slug: 'dukan-pro' }, { slug: 'zaiqa-mahal' }],
    },
  });

  if (!restaurant) {
    restaurant = await prisma.restaurant.findFirst();
  }

  if (!restaurant) {
    console.error('No restaurant found in DB. Run npm run seed:admin first.');
    process.exit(1);
  }

  // Update restaurant name and description to reflect rich culinary offerings
  restaurant = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      name: 'Zaiqa Mahal & River View Restaurant | ذائقہ محل',
      slug: 'zaiqa-mahal',
      description: 'Timergara and Lower Dir’s premier dining destination. Specializing in Shinwari Karahi, Live Charcoal BBQ, Gourmet Pizzas, Fast Food, Continental Steaks, Fresh Desserts & Authentic Quetta Chai.',
      cuisines: ['Shinwari', 'BBQ', 'Fast Food', 'Continental', 'Desi'],
      addressText: 'River Road, Balambat Bridge, Timergara, Lower Dir',
      logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&h=300&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&h=400&q=80',
    },
  });

  console.log(`✔ Restaurant updated: ${restaurant.name} (ID: ${restaurant.id}, Slug: ${restaurant.slug})`);

  // 2. Clear existing menu items and categories for a clean seed
  console.log('Cleaning old menu items & categories for this restaurant...');
  await prisma.menuItemVariant.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  await prisma.menuItem.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  await prisma.menuCategory.deleteMany({
    where: { restaurantId: restaurant.id },
  });

  console.log('Inserting categories, items, and variants...');

  let totalItemsCount = 0;
  let totalVariantsCount = 0;

  for (let catIdx = 0; catIdx < CATALOG_DATA.length; catIdx++) {
    const catDef = CATALOG_DATA[catIdx];
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: catDef.name,
        sortOrder: catIdx + 1,
        isActive: true,
      },
    });

    for (let itemIdx = 0; itemIdx < catDef.items.length; itemIdx++) {
      const itemDef = catDef.items[itemIdx];
      const hasVariants = Boolean(itemDef.variants && itemDef.variants.length > 0);

      const basePriceInPaisa =
        !hasVariants && itemDef.basePriceInRs !== undefined
          ? BigInt(itemDef.basePriceInRs) * 100n
          : null;

      const isDealItem =
        catDef.name.toLowerCase().includes('deal') ||
        catDef.name.toLowerCase().includes('combo') ||
        itemDef.name.toLowerCase().includes('deal');

      const originalPriceInPaisa =
        isDealItem && basePriceInPaisa
          ? (basePriceInPaisa * 125n) / 100n
          : null;

      const createdItem = await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: itemDef.name.slice(0, 95),
          description: itemDef.description ? itemDef.description.slice(0, 280) : null,
          imageUrl: getDishImage(itemDef.name, catDef.name),
          basePrice: basePriceInPaisa,
          originalPrice: originalPriceInPaisa,
          isDeal: isDealItem,
          isAvailable: true,
          isActive: true,
          sortOrder: itemIdx + 1,
        },
      });
      totalItemsCount++;

      if (hasVariants && itemDef.variants) {
        for (let varIdx = 0; varIdx < itemDef.variants.length; varIdx++) {
          const v = itemDef.variants[varIdx];
          await prisma.menuItemVariant.create({
            data: {
              restaurantId: restaurant.id,
              menuItemId: createdItem.id,
              name: v.name,
              price: BigInt(v.priceInRs) * 100n, // Convert PKR to Paisa
              isActive: true,
              sortOrder: varIdx + 1,
            },
          });
          totalVariantsCount++;
        }
      }
    }
  }

  console.log('\n======================================================');
  console.log('🎉 Menu Seeding Completed Successfully!');
  console.log(`  - Restaurant:      ${restaurant.name}`);
  console.log(`  - Slug:            ${restaurant.slug}`);
  console.log(`  - Categories:      ${CATALOG_DATA.length}`);
  console.log(`  - Total Items:     ${totalItemsCount}`);
  console.log(`  - Total Variants:  ${totalVariantsCount}`);
  console.log('======================================================\n');

  await prisma.$disconnect();
}

seedMenu().catch((err) => {
  console.error('Failed to seed menu:', err);
  process.exit(1);
});
