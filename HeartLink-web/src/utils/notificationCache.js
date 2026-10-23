/**
 * HL-035: mark notifications read on screen straight away (the notifications page and the bell). Edits React
 * Query's copy of one notifications address; the save through apiFetch then refreshes it from the server.
 * Returns an undo for when the save fails.
 */
export function markNotificationsRead(queryClient, queryKey, userId, shouldMark, allRead = false) {
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, (old) => {
    if (!old) return old;
    let newlyRead = 0;
    const items = (old.items || []).map((n) => {
      if (!shouldMark(n) || n.read_by?.includes(userId)) return n;
      newlyRead += 1;
      return { ...n, read_by: [...(n.read_by || []), userId] };
    });
    return { ...old, items, unread_count: allRead ? 0 : Math.max(0, (old.unread_count || 0) - newlyRead) };
  });
  return () => queryClient.setQueryData(queryKey, previous);
}
