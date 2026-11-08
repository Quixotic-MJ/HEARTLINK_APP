export function navigateTabs(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const tabs = [
    ...event.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)'),
  ];
  const index = tabs.indexOf(event.target.closest('[role="tab"]'));
  if (index < 0 || !tabs.length) return;
  let next;
  switch (event.key) {
    case "ArrowRight":
      next = (index + 1) % tabs.length;
      break;
    case "ArrowLeft":
      next = (index + tabs.length - 1) % tabs.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = tabs.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}
