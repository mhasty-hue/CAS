import { PublicOrderPage } from "@/components/cas/public-order";

export default async function OrganizationOrderPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
  const { organizationSlug } = await params;
  return <PublicOrderPage organizationSlug={organizationSlug} />;
}
