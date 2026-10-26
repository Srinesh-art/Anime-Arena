import { db, initDb } from '../db/schema';
import { Anime, Character } from '@anime-arena/shared';

export interface SeedDataset {
  franchise: string;
  anime: {
    id: string;
    canonicalTitle: string;
    englishTitle: string;
    description: string;
    coverImage: string;
    genres: string[];
  };
  characters: Array<{
    id: string;
    canonicalId: string;
    name: string;
    form?: string;
    imageUrl: string;
    role?: string;
    aliases?: string[];
  }>;
}

export const CATALOGUE_DATA: SeedDataset[] = [
  {
    franchise: 'Dragon Ball',
    anime: {
      id: 'dbz',
      canonicalTitle: 'Dragon Ball Z',
      englishTitle: 'Dragon Ball Z',
      description: 'Goku and the Z-Fighters defend Earth against powerful extraterrestrial foes.',
      coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80',
      genres: ['Action', 'Martial Arts', 'Shounen']
    },
    characters: [
      { id: 'goku_base', canonicalId: 'goku', name: 'Son Goku', form: 'Base / Kaioken', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80', role: 'Protagonist', aliases: ['Kakarot'] },
      { id: 'goku_ssj', canonicalId: 'goku', name: 'Son Goku', form: 'Super Saiyan', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80', role: 'Protagonist' },
      { id: 'vegeta_base', canonicalId: 'vegeta', name: 'Vegeta', form: 'Base', imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80', role: 'Rival / Deuteragonist', aliases: ['Prince of Saiyans'] },
      { id: 'vegeta_ssj', canonicalId: 'vegeta', name: 'Vegeta', form: 'Super Saiyan Blue', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80', role: 'Deuteragonist' },
      { id: 'gohan_teen', canonicalId: 'gohan', name: 'Son Gohan', form: 'SSJ2 Youth', imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&q=80', role: 'Support' },
      { id: 'piccolo', canonicalId: 'piccolo', name: 'Piccolo', form: 'Namekian Warrior', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', role: 'Mentor' },
      { id: 'frieza_final', canonicalId: 'frieza', name: 'Frieza', form: 'Final Form', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', role: 'Antagonist' }
    ]
  },
  {
    franchise: 'Naruto',
    anime: {
      id: 'naruto_shippuden',
      canonicalTitle: 'Naruto Shippuden',
      englishTitle: 'Naruto Shippuden',
      description: 'Naruto Uzumaki pursues his dream to become Hokage while confronting the Akatsuki.',
      coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80',
      genres: ['Action', 'Adventure', 'Ninja']
    },
    characters: [
      { id: 'naruto_sage', canonicalId: 'naruto', name: 'Naruto Uzumaki', form: 'Sage Mode', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80', role: 'Protagonist', aliases: ['Seventh Hokage'] },
      { id: 'naruto_kcm', canonicalId: 'naruto', name: 'Naruto Uzumaki', form: 'Kurama Chakra Mode', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80', role: 'Protagonist' },
      { id: 'sasuke_ems', canonicalId: 'sasuke', name: 'Sasuke Uchiha', form: 'Eternal Mangekyo', imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80', role: 'Rival', aliases: ['Shadow Hokage'] },
      { id: 'kakashi_sharingan', canonicalId: 'kakashi', name: 'Kakashi Hatake', form: 'Copy Ninja', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', role: 'Mentor' },
      { id: 'itachi_akatsuki', canonicalId: 'itachi', name: 'Itachi Uchiha', form: 'Tsukuyomi Master', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', role: 'Anti-Hero' },
      { id: 'madara_reanimated', canonicalId: 'madara', name: 'Madara Uchiha', form: 'Six Paths Reanimated', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80', role: 'Antagonist' }
    ]
  },
  {
    franchise: 'One Piece',
    anime: {
      id: 'one_piece',
      canonicalTitle: 'One Piece',
      englishTitle: 'One Piece',
      description: 'Monkey D. Luffy and the Straw Hat Pirates voyage across the Grand Line in search of the One Piece.',
      coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80',
      genres: ['Action', 'Adventure', 'Pirates']
    },
    characters: [
      { id: 'luffy_g4', canonicalId: 'luffy', name: 'Monkey D. Luffy', form: 'Gear 4 Bounceman', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80', role: 'Captain', aliases: ['Straw Hat Luffy'] },
      { id: 'luffy_g5', canonicalId: 'luffy', name: 'Monkey D. Luffy', form: 'Gear 5 Sun God Nika', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80', role: 'Captain' },
      { id: 'zoro_enma', canonicalId: 'zoro', name: 'Roronoa Zoro', form: 'King of Hell / Enma', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80', role: 'Swordsman', aliases: ['Pirate Hunter'] },
      { id: 'sanji_if', canonicalId: 'sanji', name: 'Sanji Vinsmoke', form: 'Ifrit Jambe', imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80', role: 'Cook / Fighter', aliases: ['Black Leg'] },
      { id: 'shanks', canonicalId: 'shanks', name: 'Red-Haired Shanks', form: 'Emperor of the Sea', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', role: 'Emperor' }
    ]
  },
  {
    franchise: 'Jujutsu Kaisen',
    anime: {
      id: 'jjk',
      canonicalTitle: 'Jujutsu Kaisen',
      englishTitle: 'Jujutsu Kaisen',
      description: 'Sorcerers combat cursed spirits born from negative human emotions.',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
      genres: ['Supernatural', 'Dark Fantasy', 'Action']
    },
    characters: [
      { id: 'gojo_infinity', canonicalId: 'gojo', name: 'Satoru Gojo', form: 'Limitless / Six Eyes', imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&q=80', role: 'Special Grade Sorcerer', aliases: ['The Strongest'] },
      { id: 'sukuna_megumi', canonicalId: 'sukuna', name: 'Ryomen Sukuna', form: 'King of Curses (20 Fingers)', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', role: 'Antagonist' },
      { id: 'itadori_shinjuku', canonicalId: 'itadori', name: 'Yuji Itadori', form: 'Divergent Fist & Blood Manipulation', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80', role: 'Protagonist' },
      { id: 'yuta_rika', canonicalId: 'yuta', name: 'Yuta Okkotsu', form: 'Manifested Rika & Domain', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', role: 'Special Grade' },
      { id: 'toji_zenin', canonicalId: 'toji', name: 'Toji Fushiguro', form: 'Heavenly Restriction', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80', role: 'Sorcerer Killer' }
    ]
  },
  {
    franchise: 'Bleach',
    anime: {
      id: 'bleach_tybw',
      canonicalTitle: 'Bleach: Thousand-Year Blood War',
      englishTitle: 'Bleach: TYBW',
      description: 'Soul Reapers fight against the Quincy empire led by Yhwach.',
      coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80',
      genres: ['Action', 'Supernatural', 'Swordplay']
    },
    characters: [
      { id: 'ichigo_hos', canonicalId: 'ichigo', name: 'Ichigo Kurosaki', form: 'Horn of Salvation / True Bankai', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80', role: 'Substitute Soul Reaper' },
      { id: 'aizen_hogyoku', canonicalId: 'aizen', name: 'Sosuke Aizen', form: 'Mukeny Kyoka Suigetsu', imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80', role: 'Mastermind' },
      { id: 'yamamoto_bankai', canonicalId: 'yamamoto', name: 'Genryusai Yamamoto', form: 'Zanka no Tachi', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', role: 'Head Captain' },
      { id: 'kenpachi_bankai', canonicalId: 'kenpachi', name: 'Kenpachi Zaraki', form: 'Demon Bankai', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', role: 'Captain' }
    ]
  },
  {
    franchise: 'Attack on Titan',
    anime: {
      id: 'aot',
      canonicalTitle: 'Attack on Titan',
      englishTitle: 'Attack on Titan',
      description: 'Humanity struggles for survival against giant man-eating humanoids named Titans.',
      coverImage: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80',
      genres: ['Dark Fantasy', 'Action', 'Mystery']
    },
    characters: [
      { id: 'eren_founding', canonicalId: 'eren', name: 'Eren Yeager', form: 'Founding Titan / Rumbling', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', role: 'Anti-Hero' },
      { id: 'levi_ackerman', canonicalId: 'levi', name: 'Levi Ackerman', form: 'Humanitys Strongest Soldier', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80', role: 'Captain' },
      { id: 'mikasa_ackerman', canonicalId: 'mikasa', name: 'Mikasa Ackerman', form: 'Scout Regiment Elite', imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80', role: 'Protector' }
    ]
  },
  {
    franchise: 'Hunter x Hunter',
    anime: {
      id: 'hxh',
      canonicalTitle: 'Hunter x Hunter',
      englishTitle: 'Hunter x Hunter',
      description: 'Gon Freecss embarks on a journey to become a Hunter and find his father Ging.',
      coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&q=80',
      genres: ['Adventure', 'Fantasy', 'Martial Arts']
    },
    characters: [
      { id: 'gon_adult', canonicalId: 'gon', name: 'Gon Freecss', form: 'Adult Transformation', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80', role: 'Protagonist' },
      { id: 'killua_godspeed', canonicalId: 'killua', name: 'Killua Zoldyck', form: 'Godspeed / Whirlwind', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80', role: 'Deuteragonist' },
      { id: 'meruem_post_rose', canonicalId: 'meruem', name: 'Meruem', form: 'Chimera Ant King (Post-Rose)', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80', role: 'King' },
      { id: 'kurapika_emperor', canonicalId: 'kurapika', name: 'Kurapika', form: 'Emperor Time', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', role: 'Avenger' }
    ]
  },
  {
    franchise: 'Solo Leveling',
    anime: {
      id: 'solo_leveling',
      canonicalTitle: 'Solo Leveling',
      englishTitle: 'Solo Leveling',
      description: 'Sung Jin-woo rises from the weakest E-Rank hunter to the absolute Shadow Monarch.',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
      genres: ['Action', 'Fantasy', 'Supernatural']
    },
    characters: [
      { id: 'jinwoo_monarch', canonicalId: 'jinwoo', name: 'Sung Jin-woo', form: 'Shadow Monarch', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80', role: 'Monarch', aliases: ['Shadow Monarch'] },
      { id: 'beru', canonicalId: 'beru', name: 'Beru', form: 'Ant King Marshal', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', role: 'Shadow Commander' },
      { id: 'igris', canonicalId: 'igris', name: 'Igris', form: 'Blood-Red Knight Commander', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', role: 'Knight Commander' }
    ]
  },
  {
    franchise: 'Frieren',
    anime: {
      id: 'frieren_anime',
      canonicalTitle: 'Frieren: Beyond Journey\'s End',
      englishTitle: 'Frieren: Beyond Journey\'s End',
      description: 'An elf mage contemplates life and mortality decades after defeating the Demon King with her companions.',
      coverImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80',
      genres: ['Fantasy', 'Adventure', 'Drama']
    },
    characters: [
      { id: 'frieren_mage', canonicalId: 'frieren', name: 'Frieren', form: 'Ancient Elf Mage', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80', role: 'Mage', aliases: ['Frieren the Slayer'] },
      { id: 'fern', canonicalId: 'fern', name: 'Fern', form: 'Zoltraak Specialist', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80', role: 'Apprentice' },
      { id: 'himmel', canonicalId: 'himmel', name: 'Himmel the Hero', form: 'Legendary Sword Master', imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&q=80', role: 'Hero' }
    ]
  },
  {
    franchise: 'Demon Slayer',
    anime: {
      id: 'demon_slayer',
      canonicalTitle: 'Demon Slayer: Kimetsu no Yaiba',
      englishTitle: 'Demon Slayer',
      description: 'Tanjiro Kamado trains as a Demon Slayer after his family is slaughtered and his sister turned into a demon.',
      coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80',
      genres: ['Action', 'Historical', 'Supernatural']
    },
    characters: [
      { id: 'tanjiro_sun', canonicalId: 'tanjiro', name: 'Tanjiro Kamado', form: 'Sun Breathing 13th Form', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80', role: 'Protagonist' },
      { id: 'rengoku_flame', canonicalId: 'rengoku', name: 'Kyojuro Rengoku', form: 'Flame Hashira (9th Form)', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80', role: 'Hashira' },
      { id: 'muzan_combat', canonicalId: 'muzan', name: 'Muzan Kibutsuji', form: 'Demon King Combat Form', imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', role: 'Antagonist' },
      { id: 'kokushibo_moon', canonicalId: 'kokushibo', name: 'Kokushibo', form: 'Upper Moon One Moon Breathing', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80', role: 'Upper Rank 1' }
    ]
  }
];

export function seedCatalogue() {
  initDb();

  const insertAnime = db.prepare(`
    INSERT OR REPLACE INTO anime (id, franchise_id, canonical_title, english_title, original_title, description, cover_image, genres, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertChar = db.prepare(`
    INSERT OR REPLACE INTO characters (id, canonical_id, anime_id, franchise, name, original_name, aliases, form, image_url, role, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const dataset of CATALOGUE_DATA) {
      insertAnime.run(
        dataset.anime.id,
        dataset.franchise,
        dataset.anime.canonicalTitle,
        dataset.anime.englishTitle,
        dataset.anime.canonicalTitle,
        dataset.anime.description,
        dataset.anime.coverImage,
        JSON.stringify(dataset.anime.genres),
        Date.now()
      );

      for (const char of dataset.characters) {
        insertChar.run(
          char.id,
          char.canonicalId,
          dataset.anime.id,
          dataset.franchise,
          char.name,
          char.name,
          JSON.stringify(char.aliases || []),
          char.form || 'Base',
          char.imageUrl,
          char.role || 'Combatant',
          `${char.name} from ${dataset.franchise}`,
          Date.now()
        );
      }
    }
  });

  transaction();
  console.log(`[Database] Seeded ${CATALOGUE_DATA.length} franchises with character variants successfully.`);
}
