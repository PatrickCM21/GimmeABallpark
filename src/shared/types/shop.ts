import type { UserLifetimeStats } from './stats';

export type BatId = 'default' | 'metal' | 'zombie_killer' | 'inflatable';

export type BallId = 'default' | 'tennis' | 'cricket' | 'golf';

export type ShopCategory = 'bat' | 'ball';

export type BatItem = {
  id: BatId;
  name: string;
  price: number;
  description: string;
};

export type BallItem = {
  id: BallId;
  name: string;
  price: number;
  description: string;
};

export const BAT_ITEMS: readonly BatItem[] = [
  {
    id: 'default',
    name: 'Classic Wood',
    price: 0,
    description: 'Standard maple wood bat with pro grip.',
  },
  {
    id: 'metal',
    name: 'Metal',
    price: 50,
    description: 'Heavy-duty brushed aluminum slugger.',
  },
  {
    id: 'zombie_killer',
    name: 'Zombie Killer',
    price: 100,
    description: 'Apocalypse ash bat with a nail driven through it.',
  },
  {
    id: 'inflatable',
    name: 'Inflatable',
    price: 200,
    description: 'Bouncy vinyl bat with comic POW! action.',
  },
] as const;

export const BALL_ITEMS: readonly BallItem[] = [
  {
    id: 'default',
    name: 'Classic Baseball',
    price: 0,
    description: 'Standard cowhide baseball with red stitched seams.',
  },
  {
    id: 'tennis',
    name: 'Tennis Ball',
    price: 50,
    description: 'Optic yellow felt ball with corkscrew topspin.',
  },
  {
    id: 'cricket',
    name: 'Cricket Ball',
    price: 100,
    description: 'Polished cherry leather with a canted seam spin.',
  },
  {
    id: 'golf',
    name: 'Golf Ball',
    price: 200,
    description: 'Dimpled tour ball with high-RPM backspin.',
  },
] as const;

export function getAvailableBatItems(): readonly BatItem[] {
  return BAT_ITEMS;
}

export function getBatItemById(id?: string | null): BatItem | undefined {
  if (!id) return undefined;
  return BAT_ITEMS.find((item) => item.id === id);
}

export function isValidBatId(id?: string | null): id is BatId {
  return Boolean(getBatItemById(id));
}

export function getAvailableBallItems(): readonly BallItem[] {
  return BALL_ITEMS;
}

export function getBallItemById(id?: string | null): BallItem | undefined {
  if (!id) return undefined;
  return BALL_ITEMS.find((item) => item.id === id);
}

export function isValidBallId(id?: string | null): id is BallId {
  return Boolean(getBallItemById(id));
}

export function sumOwnedBatsCost(ownedBats?: readonly string[] | null): number {
  if (!ownedBats || !Array.isArray(ownedBats)) return 0;
  let total = 0;
  const seen = new Set<string>();
  for (const id of ownedBats) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    const item = getBatItemById(id);
    if (item && item.price > 0) {
      total += item.price;
    }
  }
  return total;
}

export function sumOwnedBallsCost(ownedBalls?: readonly string[] | null): number {
  if (!ownedBalls || !Array.isArray(ownedBalls)) return 0;
  let total = 0;
  const seen = new Set<string>();
  for (const id of ownedBalls) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    const item = getBallItemById(id);
    if (item && item.price > 0) {
      total += item.price;
    }
  }
  return total;
}

export function sumOwnedShopCost(
  ownedBats?: readonly string[] | null,
  ownedBalls?: readonly string[] | null
): number {
  return sumOwnedBatsCost(ownedBats) + sumOwnedBallsCost(ownedBalls);
}

export type ShopBuyRequest = {
  itemId: string;
  category?: ShopCategory | undefined;
};

export type ShopBuyResponse = {
  success: boolean;
  bases: number;
  equippedBat: BatId;
  ownedBats: BatId[];
  equippedBall: BallId;
  ownedBalls: BallId[];
  lifetimeStats?: UserLifetimeStats | undefined;
};

export type ShopEquipRequest = {
  itemId: string;
  category?: ShopCategory | undefined;
};

export type ShopEquipResponse = {
  success: boolean;
  equippedBat: BatId;
  equippedBall: BallId;
};
