import { CasApp } from "@/components/cas-app";
import { isServerPublicDemoMode } from "@/lib/demo/mode";

export default function Home() {
  return <CasApp publicDemoEnabled={isServerPublicDemoMode()} />;
}
