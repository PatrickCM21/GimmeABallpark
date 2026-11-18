import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  getAvailableBatItems,
  getAvailableBallItems,
  type BatId,
  type BatItem,
  type BallId,
  type BallItem,
  type ShopCategory,
} from '../../../shared/types/shop';
import { triggerToast } from '../../utils/toast';
import { homeRunApi } from '../homeRunApi';
import { BaseballBat } from './BaseballBat';
import { HurlingBall } from './HurlingBall';
import { BaseBagIcon } from './LeaderboardModal';

export type ShopModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userBases: number;
  equippedBat: BatId;
  ownedBats: readonly BatId[];
  equippedBall?: BallId | undefined;
  ownedBalls?: readonly BallId[] | undefined;
  isDev?: boolean | undefined;
  onUpdateShopState: (next: {
    userBases?: number;
    equippedBat?: BatId;
    ownedBats?: BatId[];
    equippedBall?: BallId;
    ownedBalls?: BallId[];
  }) => void;
};

export const BatStoreIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="#1E1B4B"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* Store awning & frame */}
    <path d="M3 9l1.8-5h14.4L21 9" fill="#FACC15" />
    <path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" fill="#EF4444" />
    <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" fill="#FFFFFF" />
    {/* Mini crossed bat & ball accent inside storefront */}
    <line x1="9.5" y1="18" x2="14.5" y2="13" stroke="#D97706" strokeWidth="2.4" />
    <circle cx="14.5" cy="16.5" r="1.4" fill="#FACC15" stroke="#1E1B4B" strokeWidth="1.2" />
  </svg>
);

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  userBases,
  equippedBat,
  ownedBats,
  equippedBall = 'default',
  ownedBalls = ['default'],
  isDev = false,
  onUpdateShopState,
}) => {
  const [showEarnInfoModal, setShowEarnInfoModal] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ShopCategory>('bat');

  const bats = getAvailableBatItems();
  const balls = getAvailableBallItems();

  const handleEquipBat = useCallback(
    async (itemId: BatId, isDevOverride = false) => {
      const item = bats.find((b) => b.id === itemId);
      onUpdateShopState({ equippedBat: itemId });
      if (item) {
        triggerToast(
          isDevOverride ? `Dev equipped: ${item.name} Bat` : `Equipped ${item.name} Bat!`,
          isDevOverride ? '🛠️' : '✓'
        );
      }
      try {
        const res = await homeRunApi.equipBat({ itemId, category: 'bat' });
        if (res.success && res.equippedBat) {
          onUpdateShopState({ equippedBat: res.equippedBat });
        }
      } catch (err) {
        console.error('Failed to equip bat:', err);
        triggerToast('Failed to equip bat', '❌');
      }
    },
    [bats, onUpdateShopState]
  );

  const handleEquipBall = useCallback(
    async (itemId: BallId, isDevOverride = false) => {
      const item = balls.find((b) => b.id === itemId);
      onUpdateShopState({ equippedBall: itemId });
      if (item) {
        triggerToast(
          isDevOverride ? `Dev equipped: ${item.name}` : `Equipped ${item.name}!`,
          isDevOverride ? '🛠️' : '✓'
        );
      }
      try {
        const res = await homeRunApi.equipBat({ itemId, category: 'ball' });
        if (res.success && res.equippedBall) {
          onUpdateShopState({ equippedBall: res.equippedBall });
        }
      } catch (err) {
        console.error('Failed to equip ball:', err);
        triggerToast('Failed to equip ball', '❌');
      }
    },
    [balls, onUpdateShopState]
  );

  const handleBuyBat = useCallback(
    (itemId: BatId, price: number) => {
      if (busyKey) return;
      const item = bats.find((b) => b.id === itemId);
      if (userBases < price) {
        const deficit = price - userBases;
        triggerToast(
          `Need ${deficit} more ${deficit === 1 ? 'base' : 'bases'}! Play Home Run Derby to earn more.`,
          '⚾'
        );
        return;
      }

      const prevBases = userBases;
      const prevOwned = [...ownedBats];
      const prevEquipped = equippedBat;
      const nextOwned: BatId[] = ownedBats.includes(itemId) ? [...ownedBats] : [...ownedBats, itemId];

      setBusyKey(`bat:${itemId}`);
      onUpdateShopState({
        userBases: Math.max(0, userBases - price),
        ownedBats: nextOwned,
        equippedBat: itemId,
      });
      triggerToast(`Purchased & Equipped ${item ? item.name : 'Bat'}!`, '🎉');

      homeRunApi
        .buyBat({ itemId, category: 'bat' })
        .then((data) => {
          if (data.success) {
            onUpdateShopState({
              userBases: data.bases,
              ownedBats: data.ownedBats,
              equippedBat: data.equippedBat,
              ownedBalls: data.ownedBalls,
              equippedBall: data.equippedBall,
            });
          } else {
            onUpdateShopState({
              userBases: prevBases,
              ownedBats: prevOwned,
              equippedBat: prevEquipped,
            });
            triggerToast('Failed to buy bat', '❌');
          }
        })
        .catch((err) => {
          console.error('Failed to buy bat:', err);
          onUpdateShopState({
            userBases: prevBases,
            ownedBats: prevOwned,
            equippedBat: prevEquipped,
          });
          triggerToast('Failed to buy bat', '❌');
        })
        .finally(() => {
          setBusyKey(null);
        });
    },
    [bats, busyKey, equippedBat, onUpdateShopState, ownedBats, userBases]
  );

  const handleBuyBall = useCallback(
    (itemId: BallId, price: number) => {
      if (busyKey) return;
      const item = balls.find((b) => b.id === itemId);
      if (userBases < price) {
        const deficit = price - userBases;
        triggerToast(
          `Need ${deficit} more ${deficit === 1 ? 'base' : 'bases'}! Play Home Run Derby to earn more.`,
          '⚾'
        );
        return;
      }

      const prevBases = userBases;
      const prevOwned = [...ownedBalls];
      const prevEquipped = equippedBall;
      const nextOwned: BallId[] = ownedBalls.includes(itemId) ? [...ownedBalls] : [...ownedBalls, itemId];

      setBusyKey(`ball:${itemId}`);
      onUpdateShopState({
        userBases: Math.max(0, userBases - price),
        ownedBalls: nextOwned,
        equippedBall: itemId,
      });
      triggerToast(`Purchased & Equipped ${item ? item.name : 'Ball'}!`, '🎉');

      homeRunApi
        .buyBat({ itemId, category: 'ball' })
        .then((data) => {
          if (data.success) {
            onUpdateShopState({
              userBases: data.bases,
              ownedBats: data.ownedBats,
              equippedBat: data.equippedBat,
              ownedBalls: data.ownedBalls,
              equippedBall: data.equippedBall,
            });
          } else {
            onUpdateShopState({
              userBases: prevBases,
              ownedBalls: prevOwned,
              equippedBall: prevEquipped,
            });
            triggerToast('Failed to buy ball', '❌');
          }
        })
        .catch((err) => {
          console.error('Failed to buy ball:', err);
          onUpdateShopState({
            userBases: prevBases,
            ownedBalls: prevOwned,
            equippedBall: prevEquipped,
          });
          triggerToast('Failed to buy ball', '❌');
        })
        .finally(() => {
          setBusyKey(null);
        });
    },
    [balls, busyKey, equippedBall, onUpdateShopState, ownedBalls, userBases]
  );

  const handleDevAddBases = async () => {
    try {
      const res = await homeRunApi.devAdjustBases({ amount: 100 });
      if (res.success) {
        onUpdateShopState({
          userBases: res.bases,
          equippedBat: res.equippedBat,
          ownedBats: res.ownedBats,
          equippedBall: res.equippedBall,
          ownedBalls: res.ownedBalls,
        });
        triggerToast('+100 Dev Bases added!', '🛠️');
      }
    } catch (err) {
      console.error('Failed to add dev bases:', err);
    }
  };

  const handleDevResetOwned = async () => {
    try {
      const res = await homeRunApi.devAdjustBases({ resetOwned: true });
      if (res.success) {
        onUpdateShopState({
          userBases: res.bases,
          equippedBat: res.equippedBat,
          ownedBats: res.ownedBats,
          equippedBall: res.equippedBall,
          ownedBalls: res.ownedBalls,
        });
        triggerToast('Reset owned bats & balls!', '🔄');
      }
    } catch (err) {
      console.error('Failed to reset owned items:', err);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const renderBatCard = (item: BatItem) => {
    const isOwned = item.price === 0 || ownedBats.includes(item.id);
    const isEquipped = equippedBat === item.id;
    const canAfford = userBases >= item.price;

    return (
      <div
        key={`bat-${item.id}`}
        className={`shop-bat-card ${isEquipped ? 'is-equipped' : ''}`}
      >
        {isDev && !isOwned && (
          <button
            type="button"
            className={`shop-dev-equip-btn ${isEquipped ? 'is-active' : ''}`}
            title="Dev Mode: Equip without buying"
            onClick={(e) => {
              e.stopPropagation();
              void handleEquipBat(item.id, true);
            }}
          >
            {isEquipped ? 'DEV ON' : 'DEV EQUIP'}
          </button>
        )}

        <div className="shop-bat-preview">
          <div className="shop-bat-preview-inner">
            <BaseballBat batId={item.id} className="w-6 h-14 sm:w-8 sm:h-18 drop-shadow-md" />
          </div>
        </div>

        <div className="shop-bat-name">{item.name}</div>
        <div className="shop-bat-desc">{item.description}</div>

        <div className="shop-bat-price">
          {isOwned ? (
            <span className="shop-owned-pill">Owned</span>
          ) : (
            <span className="shop-price-pill">
              <BaseBagIcon size={14} />
              <span>{item.price} Bases</span>
            </span>
          )}
        </div>

        {isEquipped ? (
          <button type="button" className="shop-bat-btn btn-state-equipped" disabled>
            ✓ EQUIPPED
          </button>
        ) : isOwned ? (
          <button
            type="button"
            className="shop-bat-btn btn-state-equip"
            onClick={() => void handleEquipBat(item.id)}
          >
            EQUIP
          </button>
        ) : (
          <button
            type="button"
            disabled={busyKey === `bat:${item.id}`}
            className={`shop-bat-btn btn-state-buy ${!canAfford ? 'btn-cannot-afford' : ''}`}
            onClick={() => handleBuyBat(item.id, item.price)}
          >
            BUY
          </button>
        )}
      </div>
    );
  };

  const renderBallCard = (item: BallItem) => {
    const isOwned = item.price === 0 || ownedBalls.includes(item.id);
    const isEquipped = equippedBall === item.id;
    const canAfford = userBases >= item.price;

    return (
      <div
        key={`ball-${item.id}`}
        className={`shop-bat-card ${isEquipped ? 'is-equipped' : ''}`}
      >
        {isDev && !isOwned && (
          <button
            type="button"
            className={`shop-dev-equip-btn ${isEquipped ? 'is-active' : ''}`}
            title="Dev Mode: Equip without buying"
            onClick={(e) => {
              e.stopPropagation();
              void handleEquipBall(item.id, true);
            }}
          >
            {isEquipped ? 'DEV ON' : 'DEV EQUIP'}
          </button>
        )}

        <div className="shop-bat-preview">
          <div className="shop-ball-preview-inner">
            <HurlingBall
              ballId={item.id}
              size={34}
              showWind={false}
              wobble={false}
              spinning={true}
              spinMode="3d"
            />
          </div>
        </div>

        <div className="shop-bat-name">{item.name}</div>
        <div className="shop-bat-desc">{item.description}</div>

        <div className="shop-bat-price">
          {isOwned ? (
            <span className="shop-owned-pill">Owned</span>
          ) : (
            <span className="shop-price-pill">
              <BaseBagIcon size={14} />
              <span>{item.price} Bases</span>
            </span>
          )}
        </div>

        {isEquipped ? (
          <button type="button" className="shop-bat-btn btn-state-equipped" disabled>
            ✓ EQUIPPED
          </button>
        ) : isOwned ? (
          <button
            type="button"
            className="shop-bat-btn btn-state-equip"
            onClick={() => void handleEquipBall(item.id)}
          >
            EQUIP
          </button>
        ) : (
          <button
            type="button"
            disabled={busyKey === `ball:${item.id}`}
            className={`shop-bat-btn btn-state-buy ${!canAfford ? 'btn-cannot-afford' : ''}`}
            onClick={() => handleBuyBall(item.id, item.price)}
          >
            BUY
          </button>
        )}
      </div>
    );
  };

  return createPortal(
    <div
      className="leaderboard-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bat-shop-title"
    >
      <div
        className="leaderboard-modal-content shop-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="leaderboard-header">
          <div className="leaderboard-header-left">
            <button
              type="button"
              className="leaderboard-help-btn"
              onClick={() => setShowEarnInfoModal(true)}
              title="How to earn bases"
              aria-label="How to earn bases"
            >
              ?
            </button>
            {isDev && (
              <>
                <button
                  type="button"
                  className="leaderboard-find-me-btn"
                  onClick={() => void handleDevAddBases()}
                  title="Dev Mode: Add 100 Bases"
                >
                  +100
                </button>
                <button
                  type="button"
                  className="leaderboard-find-me-btn"
                  onClick={() => void handleDevResetOwned()}
                  title="Dev Mode: Reset Owned Items"
                >
                  Reset
                </button>
              </>
            )}
          </div>

          <h2 id="bat-shop-title" className="leaderboard-title">
            <BatStoreIcon size={20} /> PRO SHOP
          </h2>

          <div className="leaderboard-header-right" style={{ gap: '6px' }}>
            <div className="shop-bases-badge" title="Your Spendable Bases">
              <BaseBagIcon size={17} />
              <span>{userBases.toLocaleString()}</span>
            </div>
            <button
              type="button"
              className="leaderboard-close-btn"
              onClick={onClose}
              title="Close Store"
              aria-label="Close Store"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Top Category Selection Bar */}
        <div className="leaderboard-tabs-bar shop-tabs-bar">
          <div className="leaderboard-tabs-group" role="tablist" aria-label="Shop Categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'bat'}
              className={`leaderboard-tab-btn ${activeSection === 'bat' ? 'active' : ''}`}
              onClick={() => setActiveSection('bat')}
            >
              🏏 Bats ({bats.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'ball'}
              className={`leaderboard-tab-btn ${activeSection === 'ball' ? 'active' : ''}`}
              onClick={() => setActiveSection('ball')}
            >
              ⚾ Balls ({balls.length})
            </button>
          </div>
        </div>

        {/* Store Grid Body: Separate menu view for Bats vs Balls */}
        <div className="shop-modal-body">
          <div className="shop-bat-grid">
            {activeSection === 'bat'
              ? bats.map((item) => renderBatCard(item))
              : balls.map((item) => renderBallCard(item))}
          </div>
        </div>

        {/* How to Earn Bases Info Popup */}
        {showEarnInfoModal && (
          <div
            className="leaderboard-info-overlay"
            onClick={() => setShowEarnInfoModal(false)}
          >
            <div
              className="leaderboard-info-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="leaderboard-info-header">
                <h3 className="leaderboard-info-title">
                  <BaseBagIcon size={20} /> HOW TO EARN BASES
                </h3>
                <button
                  type="button"
                  className="leaderboard-close-btn"
                  onClick={() => setShowEarnInfoModal(false)}
                  title="Close"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="leaderboard-info-body">
                <div className="rank-info-section">
                  <div className="rank-info-item-title">
                    <span className="text-base leading-none">⚾</span> Clear Rounds in Home Run Derby
                  </div>
                  <div className="rank-info-item-text">
                    Every correct answer in an official Home Run Derby game advances you <strong>+1 Base</strong> (up to <strong>+4 Bases</strong> for a Home Run!).
                  </div>
                </div>

                <div className="rank-info-section">
                  <div className="rank-info-item-title">
                    <BatStoreIcon size={18} /> Unlock Custom Bats &amp; Balls
                  </div>
                  <div className="rank-info-item-text">
                    Spend your bases here in the Pro Shop to unlock custom bats (<strong>Metal</strong>, <strong>Zombie Killer</strong>, <strong>Inflatable</strong>) and custom balls (<strong>Tennis Ball</strong>, <strong>Cricket Ball</strong>, <strong>Golf Ball</strong>) at 50, 100, and 200 Bases!
                  </div>
                </div>

                <div className="rank-info-section">
                  <div className="rank-info-item-title">
                    <span className="text-base leading-none">🏆</span> Leaderboard Score Stays Safe
                  </div>
                  <div className="rank-info-item-text">
                    Spending bases in the store never lowers your All-Time or Weekly Leaderboard rank—and both your equipped bat and ball are shown off on the leaderboard!
                  </div>
                </div>

                <button
                  type="button"
                  className="rank-info-got-it-btn"
                  onClick={() => setShowEarnInfoModal(false)}
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
