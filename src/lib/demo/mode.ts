export function isClientPublicDemoMode() {
  return process.env.NEXT_PUBLIC_CAS_DEMO_MODE === "true";
}

export function isServerPublicDemoMode() {
  return process.env.CAS_DEMO_MODE === "true" && isClientPublicDemoMode();
}

export function isLocalDemoDataSource() {
  return process.env.NEXT_PUBLIC_CAS_DATA_SOURCE !== "supabase";
}

export function shouldBypassAuthForPublicDemo() {
  return isServerPublicDemoMode();
}

export function shouldBlockProductionSideEffects() {
  return isServerPublicDemoMode() || isClientPublicDemoMode();
}
