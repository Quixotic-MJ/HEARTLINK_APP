// HL-076: options for the log saves (check-in, meals, exercise, sleep).
//
// React Query normally holds a save while it thinks the phone is offline, so in airplane mode Save kept spinning
// and the save never reached the phone's queue (SyncService). "always" runs it at once: with no connection the
// request fails straight away, the hook keeps the item on the phone, and the queue uploads it later. No retries
// here, because the queue already retries, and retrying a save that timed out could store it twice.
export const OFFLINE_SAVE = { networkMode: 'always', retry: false } as const;
