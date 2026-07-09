import { appraisers, calendarPreferences, clientProfiles, companyUsers, defaultOrderFormTemplate, orders, vendors } from "@/data/demo";
import { accountingEntries, invoices, organizations, portalUsers, vendorDocuments } from "@/data/platform";
import { getPermissions } from "@/lib/permissions";
import type { CasAuthContext, CasBootstrapData, CasRepository } from "./types";

export class DemoCasRepository implements CasRepository {
  mode = "demo" as const;

  async loadBootstrapData(): Promise<CasBootstrapData> {
    return {
      organizations,
      users: portalUsers,
      orders,
      clients: clientProfiles,
      companyUsers,
      appraisers,
      vendors,
      vendorDocuments,
      accountingEntries,
      invoices,
      orderFormTemplate: defaultOrderFormTemplate,
      calendarPreferences
    };
  }

  async loadAuthContext(): Promise<CasAuthContext> {
    const user = portalUsers[0];
    const organization = organizations.find((item) => item.id === user.organizationId) ?? organizations[0];
    const permissions = getPermissions(user);

    return {
      mode: "demo",
      isDemo: true,
      user,
      organization,
      memberships: [{ organization, role: user.role, permissions, status: "active" }],
      permissions
    };
  }
}

export const demoCasRepository = new DemoCasRepository();
