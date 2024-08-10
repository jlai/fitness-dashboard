/** Replace state but remove empty variables */
export function cleanHashReplaceState(searchParamsStr: string) {
  const searchParams = new URLSearchParams(searchParamsStr);
  for (const [key, value] of searchParams.entries()) {
    if (!value) {
      searchParams.delete(key);
    }
  }

  searchParamsStr = searchParams.toString();

  const hashStr = searchParamsStr ? `#${searchParamsStr}` : "";

  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}${hashStr}`
  );
}
