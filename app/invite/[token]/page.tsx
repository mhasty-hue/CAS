import { InviteAcceptancePage } from "@/components/cas/auth";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAcceptancePage token={token} />;
}
