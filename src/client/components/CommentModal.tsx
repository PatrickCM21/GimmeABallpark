import type { Config } from '../../shared/api';

export const CommentModal = ({
  showCommentModal,
  setShowCommentModal,
  config,
  commentText,
  setCommentText,
  isPostingComment,
  setIsPostingComment,
  postComment,
  showToast,
}: {
  showCommentModal: boolean;
  setShowCommentModal: (show: boolean) => void;
  config: Config;
  commentText: string;
  setCommentText: (text: string) => void;
  isPostingComment: boolean;
  setIsPostingComment: (posting: boolean) => void;
  postComment: (text: string) => Promise<any>;
  showToast: (msg: string) => void;
}) => {
  if (!showCommentModal || !config) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-200 touch-none overscroll-none"
      onTouchMove={(e) => {
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="bg-white rounded-2xl p-4 sm:p-5 w-full max-w-sm border-3 border-indigo-950 shadow-2xl flex flex-col gap-3 animate-card-enter">
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black uppercase text-indigo-950 tracking-wide flex items-center gap-1.5">
            <span>💡</span>
            <span>Wanted You To Know</span>
          </h2>
          <button
            type="button"
            onClick={() => { setShowCommentModal(false); setCommentText(''); }}
            className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Full fact text */}
        {config.explanation && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
            <p className="text-[11px] font-bold text-amber-900 mb-1">
              u/{config.authorName || 'the creator'} says:
            </p>
            <p className="text-xs sm:text-sm text-gray-800 leading-snug" style={{ wordBreak: 'break-word' }}>
              {config.explanation}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Comment area */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center">
            <label className="font-bold text-xs text-gray-700 uppercase">💬 Your Reply</label>
            <span className="text-[10px] font-bold text-gray-400">
              {commentText.length}/1000
            </span>
          </div>
          <textarea
            value={commentText}
            maxLength={1000}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="e.g. Wow, I had no idea it was that high!"
            rows={3}
            className="w-full p-2.5 bg-gray-50 rounded-xl font-bold text-xs sm:text-sm text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs focus:border-indigo-900 focus:bg-white placeholder:text-gray-400 placeholder:font-normal resize-none transition-colors"
          />
          <p className="text-[10px] text-amber-700 font-bold text-center bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            ⚠️ This will post a comment on your behalf to this post's comment section.
          </p>
        </div>

        {/* Actions */}
        <div className="w-full flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => { setShowCommentModal(false); setCommentText(''); }}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            disabled={!commentText.trim() || isPostingComment}
            onClick={async () => {
              if (!commentText.trim() || isPostingComment) return;
              setIsPostingComment(true);
              try {
                await postComment(commentText.trim());
                setShowCommentModal(false);
                setCommentText('');
                showToast('💬 Comment posted!');
              } catch {
                showToast('⚠️ Failed to post comment. Try again.');
              } finally {
                setIsPostingComment(false);
              }
            }}
            className="px-4 py-1.5 text-xs font-black uppercase rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPostingComment ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <span>Post Comment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
