import { ReactNode, Fragment } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface LockedRouteProps {
  moduleKey: string;
  children: ReactNode;
}

export default function LockedRoute({ moduleKey, children }: LockedRouteProps) {
  const { isModuleLocked, modules } = useSubscription();
  const location = useLocation();

  if (isModuleLocked(moduleKey)) {
    const mod = modules.find((m) => m.key === moduleKey);
    const name = mod ? mod.name : moduleKey;
    return (
      <Navigate
        to={`/unlock?module=${encodeURIComponent(moduleKey)}&name=${encodeURIComponent(name)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Fragment>{children}</Fragment>;
}
