import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { MessageSquarePlus, MessageSquareText } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';

/** Matches MAX_COMMENT_LENGTH on the server, which rejects anything longer. */
export const MAX_COMMENT_LENGTH = 1000;

/** How close to the limit the counter appears, so it stays out of the way. */
const COUNTER_VISIBLE_WITHIN = 100;

const VIEWPORT_MARGIN = 8;

interface Point {
  top: number;
  left: number;
}

/**
 * Position a portalled element next to its anchor, in viewport coordinates.
 *
 * The table scrolls inside `overflow-x-auto`, which clips absolutely
 * positioned children, so both the tooltip and the editor are rendered into
 * document.body instead and placed by hand. Preferring below the anchor, it
 * flips above when the space isn't there and clamps to the viewport either
 * way, so a note on the last visible row is still fully readable.
 */
const useAnchoredPosition = (
  isOpen: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  floatingRef: React.RefObject<HTMLElement | null>
): Point | null => {
  const [position, setPosition] = useState<Point | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const place = () => {
      const anchor = anchorRef.current;
      const floating = floatingRef.current;
      if (!anchor || !floating) return;

      const a = anchor.getBoundingClientRect();
      const { width, height } = floating.getBoundingClientRect();

      let top = a.bottom + VIEWPORT_MARGIN;
      if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
        const above = a.top - height - VIEWPORT_MARGIN;
        top =
          above >= VIEWPORT_MARGIN
            ? above
            : Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight - height - VIEWPORT_MARGIN
              );
      }

      const centered = a.left + a.width / 2 - width / 2;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, centered),
        Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
      );

      // Returning the previous object when nothing moved keeps this layout
      // effect from re-running itself forever.
      setPosition((prev) =>
        prev && prev.top === top && prev.left === left ? prev : { top, left }
      );
    };

    place();

    // Capture phase, so scrolling the table itself repositions too — not just
    // scrolling the page.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [isOpen, anchorRef, floatingRef]);

  return position;
};

export interface TransactionCommentProps {
  transactionId: string | number;
  /** Used to label the control, so screen readers get "Add a note to METRO". */
  description: string;
  comment: string | null;
  /** True while the pointer is anywhere on the row, which reveals the note. */
  isRowHovered: boolean;
  onCommentChange?: (
    transactionId: string | number,
    comment: string | null
  ) => void;
}

export const TransactionComment: React.FC<TransactionCommentProps> = ({
  transactionId,
  description,
  comment,
  isRowHovered,
  onCommentChange,
}) => {
  const [saved, setSaved] = useState<string | null>(comment ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasComment = saved !== null;

  // A row keeps its component when the table refetches, so the stored note has
  // to follow the prop or an edit made elsewhere would show stale text.
  useEffect(() => {
    setSaved(comment ?? null);
  }, [transactionId, comment]);

  const closeEditor = useCallback((restoreFocus: boolean) => {
    setIsEditing(false);
    setError(null);
    // Only when the user asked to close. On a click-away the focus belongs to
    // whatever they clicked, and yanking it back here would fight them.
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const persist = useCallback(
    async (nextRaw: string | null, restoreFocus: boolean) => {
      // Blank text is the same intent as clearing the note.
      const next = (nextRaw ?? '').trim() || null;

      if (next === saved) {
        closeEditor(restoreFocus);
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        const url = `${API_BASE_URL}/transactions/${transactionId}/comment`;
        const response =
          next === null
            ? await fetch(url, { method: 'DELETE' })
            : await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: next }),
              });

        if (!response.ok) {
          throw new Error(
            next === null ? 'Could not delete the note' : 'Could not save the note'
          );
        }

        setSaved(next);
        onCommentChange?.(transactionId, next);
        closeEditor(restoreFocus);
      } catch (err) {
        // Stay open on failure so the typing isn't lost with the popover.
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsSaving(false);
      }
    },
    [saved, transactionId, onCommentChange, closeEditor]
  );

  const openEditor = () => {
    setDraft(saved ?? '');
    setError(null);
    setIsEditing(true);
  };

  // Put the caret after the existing text, ready to keep writing.
  useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  // Clicking away saves rather than discards: the popover has no visible edge
  // to most people, and silently binning a paragraph of typing is worse than
  // saving something they can still edit or delete.
  useEffect(() => {
    if (!isEditing) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      persist(draft, false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isEditing, draft, persist]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Plain Enter has to stay available for new lines, so saving from the
      // keyboard is the usual modifier chord instead.
      closeEditor(true);
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      persist(draft, true);
    }
  };

  const showTooltip =
    !isEditing && hasComment && (isRowHovered || isButtonHovered);

  const tooltipPosition = useAnchoredPosition(showTooltip, buttonRef, tooltipRef);
  const editorPosition = useAnchoredPosition(isEditing, buttonRef, popoverRef);

  // Present but transparent when empty, so the column doesn't reflow on hover
  // and keyboard users can still tab to it.
  const isButtonVisible = hasComment || isRowHovered || isEditing;

  const remaining = MAX_COMMENT_LENGTH - draft.length;
  const tooltipId = `note-tooltip-${transactionId}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        // Clicking the icon while the editor is open commits rather than
        // reopening it, which would otherwise reset the draft and quietly
        // throw away whatever had just been typed.
        onClick={() => (isEditing ? persist(draft, true) : openEditor())}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        aria-label={
          hasComment
            ? `Edit note on ${description}`
            : `Add a note to ${description}`
        }
        aria-expanded={isEditing}
        aria-describedby={showTooltip ? tooltipId : undefined}
        title={hasComment ? 'Edit note' : 'Add a note'}
        className={`inline-flex items-center justify-center rounded p-1 transition-opacity motion-reduce:transition-none hover:bg-gray-200 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-500 ${
          isButtonVisible ? 'opacity-100' : 'opacity-0'
        } ${hasComment ? 'text-blue-600' : 'text-gray-400'}`}
      >
        {hasComment ? (
          <MessageSquareText size={16} />
        ) : (
          <MessageSquarePlus size={16} />
        )}
      </button>

      {showTooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              top: tooltipPosition?.top ?? 0,
              left: tooltipPosition?.left ?? 0,
              // Hidden for the first frame, while it's measured in place
              visibility: tooltipPosition ? 'visible' : 'hidden',
            }}
            className="fixed z-50 max-w-xs whitespace-pre-wrap break-words rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg"
          >
            {saved}
          </div>,
          document.body
        )}

      {isEditing &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`Note for ${description}`}
            style={{
              top: editorPosition?.top ?? 0,
              left: editorPosition?.left ?? 0,
              visibility: editorPosition ? 'visible' : 'hidden',
            }}
            className="fixed z-50 w-80 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl"
          >
            <textarea
              ref={textareaRef}
              value={draft}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              rows={3}
              placeholder="Add a note about this transaction…"
              aria-label="Note text"
              // Preflight zeroes border width and padding on form elements and
              // this project has no forms plugin, so both are set explicitly.
              className="block w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />

            {error && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              {hasComment ? (
                <button
                  type="button"
                  onClick={() => persist(null, true)}
                  disabled={isSaving}
                  className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                >
                  Delete
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => closeEditor(true)}
                  disabled={isSaving}
                  className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => persist(draft, true)}
                  disabled={isSaving}
                  className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
              <span>Ctrl/⌘ + Enter to save · Esc to cancel</span>
              {remaining <= COUNTER_VISIBLE_WITHIN && (
                <span className={remaining === 0 ? 'text-red-600' : undefined}>
                  {remaining}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
