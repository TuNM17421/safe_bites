import type { ReactNode } from 'react';

// One chat turn. User bubbles hug the right in brand ink; bot bubbles hug the left on a surface.
// Any attachment (restaurant card / proposal card) renders under the text within the same turn.
export function ChatBubble({ role, text, children }: { role: 'user' | 'bot'; text: string; children?: ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-sb-md px-3 py-2 text-sb-body-s ${
          isUser
            ? 'bg-sb-primary text-sb-primary-foreground'
            : 'border border-sb-border bg-sb-surface text-sb-fg'
        }`}
      >
        {text}
      </p>
      {children ? <div className="w-full max-w-[85%]">{children}</div> : null}
    </div>
  );
}
