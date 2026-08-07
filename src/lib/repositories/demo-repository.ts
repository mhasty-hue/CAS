import { appraisers, calendarPreferences, clientProfiles, companyUsers, defaultOrderFormTemplate, orders, vendors } from "@/data/demo";
import { demoReportVersions } from "@/data/report-review";
import {
  accountingEntries,
  automationRules,
  automationRuns,
  deliveryRecords,
  documentAuditEvents,
  emailDeliveryRecords,
  integrationLogs,
  integrationSettings,
  invoiceSettings,
  invoices,
  managedDocuments,
  notificationPreferences,
  notificationQueue,
  notificationTemplates,
  orderMessages,
  organizationInvitations,
  organizations,
  portalUsers,
  publicOrderRequests,
  publicOrderSettings,
  reportSubmissions,
  requiredDocumentRules,
  revisionRequests,
  scheduledJobs,
  vendorDocuments,
  webhookEvents,
  workflowTasks
} from "@/data/platform";
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
      invoiceSettings,
      invitations: organizationInvitations,
      publicOrderSettings,
      publicOrderRequests,
      notificationPreferences,
      notificationTemplates,
      emailDeliveryRecords,
      integrations: integrationSettings,
      integrationLogs,
      managedDocuments,
      requiredDocumentRules,
      orderMessages,
      revisionRequests,
      reportSubmissions,
      reportVersions: demoReportVersions,
      deliveryRecords,
      documentAuditEvents,
      orderFormTemplate: defaultOrderFormTemplate,
      calendarPreferences,
      automationRules,
      automationRuns,
      workflowTasks,
      notificationQueue,
      scheduledJobs,
      webhookEvents
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
