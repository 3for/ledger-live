import { useIsFocused, useNavigation } from "@react-navigation/native";
import React from "react";

export function KeepMountedOnParentRoutes({
  children,
  parentRouteNames,
}: {
  children: React.ReactNode;
  parentRouteNames: string[];
}) {
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const [shouldKeep, setShouldKeep] = React.useState(false);

  React.useEffect(() => {
    const parent = navigation.getParent?.();
    if (!parent) return;

    const updateShouldKeep = () => {
      try {
        const state = parent.getState?.();
        const getTopRoute = (
          s:
            | ReturnType<typeof parent.getState>
            | ReturnType<typeof parent.getState>["routes"][number]
            | ReturnType<typeof parent.getState>["routes"][number]["state"]
            | undefined,
        ): { name?: string } | null => {
          if (!s || typeof s !== "object" || !("routes" in s)) return null;
          const routes = s.routes;
          const index = s.index ?? 0;
          const route = routes?.[index];
          if (!route || typeof route !== "object") return null;
          const childState = route.state;
          return childState ? getTopRoute(childState) : route;
        };
        const topRoute = getTopRoute(state);
        const topName = topRoute?.name ?? null;
        setShouldKeep(topName != null && parentRouteNames.includes(topName));
      } catch {
        setShouldKeep(false);
      }
    };

    updateShouldKeep();
    const unsub = parent.addListener?.("state", updateShouldKeep);
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [navigation, parentRouteNames]);

  if (isFocused) return <>{children}</>;
  return shouldKeep ? <>{children}</> : null;
}
