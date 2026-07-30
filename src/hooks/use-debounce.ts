import * as React from "react"
import { debounce } from "lodash";

export function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = debounce((val: T) => setDebouncedValue(val), delay);
    handler(value);
    return () => handler.cancel();
  }, [value, delay]);

  return debouncedValue;
}
