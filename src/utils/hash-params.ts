import { useMemo } from "react";
import { useHash } from "react-use";

export function useHashQuery() {
  const [hash] = useHash();

  return useMemo(() => {
    const [_, queryString] = /^#\?(.*)/.exec(hash) ?? [];

    if (queryString) {
      return new URLSearchParams(queryString);
    }

    return new URLSearchParams();
  }, [hash]);
}

export function useHashQueryParam(param: string) {
  const params = useHashQuery();
  return params.get(param);
}
