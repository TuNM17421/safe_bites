// ChatMessage is inferred from chatMessageSchema (single source of truth) so the persisted /
// validated shape and the UI type can never drift.
export type { ChatMessage } from '@/lib/agent-schemas';
