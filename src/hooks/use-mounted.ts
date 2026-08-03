import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Hydration-safe "has the client mounted yet" flag, without setState-in-effect. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
