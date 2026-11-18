import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type {
  LeaderboardPeriod,
  LeaderboardResponse,
  LeaderboardEntry,
} from '../../../shared/types/leaderboard';
import { LeaderboardAvatar } from './LeaderboardAvatar';

export type LeaderboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUsername?: string | undefined;
  snoovatarUrl?: string | undefined;
  equippedBat?: string | undefined;
  equippedBall?: string | undefined;
};

type TrophyIconProps = {
  size?: number;
  cupColor?: string;
  className?: string;
};

export const TrophyIcon = ({ size = 22, cupColor = '#f59e0b', className = '' }: TrophyIconProps) => (
  <svg
    className={`vector-trophy-icon ${className}`.trim()}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="#1E1B4B"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34" />
    <path
      d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2z"
      fill={cupColor}
      stroke="#1E1B4B"
    />
  </svg>
);

export const BaseBagIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    viewBox="0 0 28 28"
    width={size}
    height={size}
    fill="none"
    style={{ display: 'inline-block', flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* Base bag shadow/depth */}
    <polygon
      points="14,3.5 25,14.5 14,25.5 3,14.5"
      fill="#FACC15"
      stroke="#1E1B4B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Crisp white diamond base top surface */}
    <polygon
      points="14,2.5 24,12.5 14,22.5 4,12.5"
      fill="#FFFFFF"
      stroke="#1E1B4B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Inner stitched diamond detail */}
    <polygon
      points="14,6 20.5,12.5 14,19 7.5,12.5"
      fill="none"
      stroke="#EF4444"
      strokeWidth="1.3"
      strokeDasharray="2 1.5"
      strokeLinejoin="round"
    />
  </svg>
);

type UsernameDisplayProps = {
  username: string;
  rowId: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
};

export const UsernameDisplay = ({
  username,
  rowId,
  expandedId,
  onToggle,
}: UsernameDisplayProps) => {
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState<boolean>(false);

  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const check = () => {
      setIsTruncated(el.scrollWidth > el.clientWidth + 1);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [username]);

  const isExpanded = isTruncated && expandedId === rowId;

  if (!isTruncated) {
    return (
      <span ref={textRef} className="leaderboard-username" title={`u/${username}`}>
        u/{username}
      </span>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`leaderboard-username-wrap is-truncated ${isExpanded ? 'is-expanded' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(rowId);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onToggle(rowId);
        }
      }}
      title={`u/${username}`}
      aria-label={`u/${username}`}
    >
      <span ref={textRef} className="leaderboard-username">
        u/{username}
      </span>
      <span className="leaderboard-username-full" aria-hidden="true">
        <span className="leaderboard-username-full-text">u/{username}</span>
      </span>
    </div>
  );
};

const LEADERBOARD_PAGE_SIZE = 5;

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  snoovatarUrl,
  equippedBat,
  equippedBall,
}) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const [page, setPage] = useState<number>(1);
  const [reloadSeed, setReloadSeed] = useState<number>(0);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRankInfoModal, setShowRankInfoModal] = useState<boolean>(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      setError(null);
    }
  }

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      ('ontouchstart' in window && window.innerWidth <= 768) ||
      window.innerWidth <= 480
    );
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile =
        window.matchMedia('(pointer: coarse)').matches ||
        ('ontouchstart' in window && window.innerWidth <= 768) ||
        window.innerWidth <= 480;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const parseLeaderboardJson = useCallback(
    (json: unknown, targetPage: number): LeaderboardResponse => {
      if (
        json &&
        typeof json === 'object' &&
        'entries' in json &&
        Array.isArray(json.entries)
      ) {
        const isEntry = (item: unknown): item is LeaderboardEntry =>
          typeof item === 'object' &&
          item !== null &&
          'rank' in item &&
          typeof item.rank === 'number' &&
          'username' in item &&
          typeof item.username === 'string' &&
          'score' in item &&
          typeof item.score === 'number';

        const rawEntries = json.entries;
        const validEntries: LeaderboardEntry[] = [];
        for (const item of rawEntries) {
          if (isEntry(item)) {
            validEntries.push(item);
          }
        }

        let currentUserEntry: LeaderboardEntry | undefined = undefined;
        if ('currentUserEntry' in json && isEntry(json.currentUserEntry)) {
          currentUserEntry = json.currentUserEntry;
        }

        const validPeriod: LeaderboardPeriod =
          'period' in json && json.period === 'weekly' ? 'weekly' : 'all_time';
        const validPage =
          'page' in json && typeof json.page === 'number' ? json.page : targetPage;
        const validPageSize =
          'pageSize' in json && typeof json.pageSize === 'number'
            ? json.pageSize
            : LEADERBOARD_PAGE_SIZE;
        const validTotalEntries =
          'totalEntries' in json && typeof json.totalEntries === 'number'
            ? json.totalEntries
            : validEntries.length;
        const validTotalPages =
          'totalPages' in json && typeof json.totalPages === 'number'
            ? json.totalPages
            : 1;

        return {
          period: validPeriod,
          entries: validEntries,
          currentUserEntry,
          page: validPage,
          pageSize: validPageSize,
          totalEntries: validTotalEntries,
          totalPages: validTotalPages,
        };
      }
      throw new Error('Invalid leaderboard response');
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    fetch(`/api/leaderboard?period=${period}&page=${page}&pageSize=${LEADERBOARD_PAGE_SIZE}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to load leaderboard');
        }
        const json: unknown = await res.json();
        return parseLeaderboardJson(json, page);
      })
      .then((parsed) => {
        if (!active) return;
        setData(parsed);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error fetching leaderboard:', err);
        setError('Unable to load rankings. Please try again.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, period, page, reloadSeed, parseLeaderboardJson]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadSeed((n) => n + 1);
  };

  const handlePeriodChange = (newPeriod: LeaderboardPeriod) => {
    if (newPeriod === period) return;
    setExpandedRowId(null);
    setLoading(true);
    setError(null);
    setPeriod(newPeriod);
    setPage(1);
  };

  const handlePrevPage = () => {
    if (page > 1 && !loading) {
      setExpandedRowId(null);
      setLoading(true);
      setError(null);
      setPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (data && page < data.totalPages && !loading) {
      setExpandedRowId(null);
      setLoading(true);
      setError(null);
      setPage((p) => p + 1);
    }
  };

  const handleFindMe = () => {
    setExpandedRowId(null);
    if (
      !currentUserEntry ||
      typeof currentUserEntry.rank !== 'number' ||
      currentUserEntry.rank <= 0
    ) {
      return;
    }
    const pageSize = data?.pageSize || LEADERBOARD_PAGE_SIZE;
    const userPage = Math.max(
      1,
      Math.min(data?.totalPages || 1, Math.ceil(currentUserEntry.rank / pageSize))
    );
    if (userPage !== page) {
      setLoading(true);
      setError(null);
      setPage(userPage);
    }
  };

  const handleToggleUsername = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const totalPages = data?.totalPages ?? 1;
  const entries = data?.entries ?? [];
  const currentUserEntry = data?.currentUserEntry;

  return createPortal(
    <div
      className={`leaderboard-modal-overlay ${isMobile ? 'leaderboard-mobile' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
    >
      <div
        className="leaderboard-modal-content"
        onClick={(e) => {
          e.stopPropagation();
          setExpandedRowId(null);
        }}
      >
        {/* Header Bar */}
        <div className="leaderboard-header">
          <div className="leaderboard-header-left">
            <button
              type="button"
              className="leaderboard-help-btn"
              onClick={() => setShowRankInfoModal(true)}
              title="How rankings work"
              aria-label="How rankings work"
            >
              ?
            </button>
            <button
              type="button"
              className="leaderboard-find-me-btn"
              onClick={handleFindMe}
              disabled={!currentUserEntry || loading}
              title={
                currentUserEntry
                  ? `Jump to your ranking (#${currentUserEntry.rank})`
                  : 'Find Me'
              }
            >
              Find Me
            </button>
          </div>

          <h2 id="leaderboard-title" className="leaderboard-title">
            <TrophyIcon size={22} /> LEADERBOARD
          </h2>

          <div className="leaderboard-header-right">
            <button
              type="button"
              className="leaderboard-close-btn"
              onClick={onClose}
              title="Close Leaderboard"
              aria-label="Close Leaderboard"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="leaderboard-tabs-bar">
          <div className="leaderboard-tabs-group" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={period === 'all_time'}
              className={`leaderboard-tab-btn ${period === 'all_time' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('all_time')}
            >
              All-Time
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === 'weekly'}
              className={`leaderboard-tab-btn ${period === 'weekly' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('weekly')}
            >
              This Week
            </button>
          </div>
        </div>

        {/* Pinned Current User Card ("YOU") */}
        {currentUserEntry && (
          <>
            <div className="leaderboard-pinned-card">
              <div className="leaderboard-rank-number">
                #{currentUserEntry.rank.toLocaleString()}
              </div>
              <div className="leaderboard-avatar-wrapper">
                <LeaderboardAvatar
                  username={currentUserEntry.username}
                  snoovatarUrl={currentUserEntry.snoovatarUrl || snoovatarUrl}
                  equippedBat={equippedBat || currentUserEntry.equippedBat}
                  equippedBall={equippedBall || currentUserEntry.equippedBall}
                  size={34}
                />
              </div>
              <div className="leaderboard-user-details">
                <div className="leaderboard-username-row">
                  <UsernameDisplay
                    username={currentUserEntry.username}
                    rowId="pinned"
                    expandedId={expandedRowId}
                    onToggle={handleToggleUsername}
                  />
                  <span className="leaderboard-you-badge">YOU</span>
                </div>
              </div>
              <div className="leaderboard-score-badge">
                <span className="score-coin-icon">
                  <BaseBagIcon size={20} />
                </span>
                <span className="score-number">
                  {currentUserEntry.score.toLocaleString()}
                </span>
                <span className="score-label">
                  {currentUserEntry.score === 1 ? 'Base' : 'Bases'}
                </span>
              </div>
            </div>
            <div className="leaderboard-pinned-divider" role="separator" />
          </>
        )}

        {/* Main List Section */}
        <div className="leaderboard-list-body">
          {loading && entries.length === 0 ? (
            <div className="leaderboard-empty-box">
              <div className="leaderboard-spinner" />
              <span>Loading rankings...</span>
            </div>
          ) : error ? (
            <div className="leaderboard-empty-box">
              <p>{error}</p>
              <button
                type="button"
                className="leaderboard-find-me-btn"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="leaderboard-empty-box">
              <p>No batters on the board for this period yet!</p>
            </div>
          ) : (
            <div className="leaderboard-entries-container">
              {entries.map((entry) => {
                const isCurrentUser =
                  entry.isCurrentUser ||
                  Boolean(currentUsername && entry.username === currentUsername);

                let rowRankClass = 'row-rank-default';
                let medal: React.ReactNode = null;
                if (entry.rank === 1) {
                  rowRankClass = 'row-rank-gold';
                  medal = <TrophyIcon size={19} cupColor="#f59e0b" />;
                } else if (entry.rank === 2) {
                  rowRankClass = 'row-rank-silver';
                  medal = <TrophyIcon size={19} cupColor="#94a3b8" />;
                } else if (entry.rank === 3) {
                  rowRankClass = 'row-rank-bronze';
                  medal = <TrophyIcon size={19} cupColor="#cd7f32" />;
                }

                return (
                  <div
                    key={`${entry.username}-${entry.rank}`}
                    className={`leaderboard-entry-row ${rowRankClass} ${
                      isCurrentUser ? 'is-current-user-row' : ''
                    }`}
                  >
                    <div className="leaderboard-rank-col">
                      {medal ? (
                        <span className="rank-medal">{medal}</span>
                      ) : (
                        <span className="rank-number">#{entry.rank}</span>
                      )}
                    </div>

                    <div className="leaderboard-avatar-wrapper">
                      <LeaderboardAvatar
                        username={entry.username}
                        snoovatarUrl={
                          entry.snoovatarUrl || (isCurrentUser ? snoovatarUrl : undefined)
                        }
                        equippedBat={
                          isCurrentUser && equippedBat ? equippedBat : entry.equippedBat
                        }
                        equippedBall={
                          isCurrentUser && equippedBall ? equippedBall : entry.equippedBall
                        }
                        size={32}
                      />
                    </div>

                    <div className="leaderboard-user-details">
                      <div className="leaderboard-username-row">
                        <UsernameDisplay
                          username={entry.username}
                          rowId={`entry-${entry.username}-${entry.rank}`}
                          expandedId={expandedRowId}
                          onToggle={handleToggleUsername}
                        />
                        {isCurrentUser && (
                          <span className="leaderboard-you-badge">YOU</span>
                        )}
                      </div>
                    </div>

                    <div className="leaderboard-score-badge">
                      <span className="score-coin-icon">
                        <BaseBagIcon size={19} />
                      </span>
                      <span className="score-number">{entry.score.toLocaleString()}</span>
                      <span className="score-label">
                        {entry.score === 1 ? 'Base' : 'Bases'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="leaderboard-footer">
          <button
            type="button"
            className="leaderboard-pag-btn"
            onClick={handlePrevPage}
            disabled={page <= 1 || loading}
            aria-label="Previous Page"
          >
            ← Prev
          </button>
          <span className="leaderboard-page-counter">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            className="leaderboard-pag-btn"
            onClick={handleNextPage}
            disabled={page >= totalPages || loading}
            aria-label="Next Page"
          >
            Next →
          </button>
        </div>

        {/* Rank Info Popup */}
        {showRankInfoModal && (
          <div
            className="leaderboard-info-overlay"
            onClick={() => setShowRankInfoModal(false)}
          >
            <div
              className="leaderboard-info-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="leaderboard-info-header">
                <h3 id="rank-info-title" className="leaderboard-info-title">
                  <TrophyIcon size={20} /> HOW RANKINGS WORK
                </h3>
                <button
                  type="button"
                  className="leaderboard-close-btn"
                  onClick={() => setShowRankInfoModal(false)}
                  title="Close"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="leaderboard-info-body">
                <div className="rank-info-section">
                  <div className="rank-info-item-title">
                    <BaseBagIcon size={20} /> Earning Bases
                  </div>
                  <div className="rank-info-item-text">
                    Tracks how many correct answers you have gotten in Home Run Derby. Every correct answer advances you <strong>1 base</strong> (up to 4 bases per game for a Home Run!).
                  </div>
                </div>

                <div className="rank-info-section">
                  <div className="rank-info-item-title">
                    <span className="text-base leading-none">⚾</span> Official Runs Count
                  </div>
                  <div className="rank-info-item-text">
                    Only your first official attempt on each Home Run Derby post counts toward the leaderboard. Practice <strong>Try Again</strong> runs do not change your score.
                  </div>
                </div>

                <div className="rank-info-section">
                  <div className="rank-info-item-title">
                    <span className="text-base leading-none">📅</span> All-Time vs This Week
                  </div>
                  <div className="rank-info-item-text">
                    <strong>All-Time</strong> displays your total lifetime bases earned. <strong>This Week</strong> displays bases earned during the current 7-day competitive week.
                  </div>
                </div>

                <button
                  type="button"
                  className="rank-info-got-it-btn"
                  onClick={() => setShowRankInfoModal(false)}
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
