import { defaultOrderFormTemplate } from "@/data/demo";
import { getPermissions } from "@/lib/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type {
  AccountingEntry,
  AppraiserProfile,
  CalendarPreference,
  ClientContact,
  ClientProfile,
  CompanyUser,
  Invoice,
  Order,
  OrderFormTemplate,
  OrderStatus,
  Organization,
  PermissionKey,
  UserRole,
  VendorDocument,
  VendorProfile
} from "@/types/domain";
import type {
  AccountingEntryRow,
  AppraiserProfileRow,
  CalendarPreferenceRow,
  ClientContactRow,
  ClientFeeDefaultRow,
  ClientRow,
  InvoiceRow,
  OrderFormTemplateRow,
  OrderRow,
  OrganizationMemberRow,
  OrganizationRow,
  RolePermissionRow,
  RoleRow,
  UserProfileRow,
  VendorProfileRow
} from "@/types/database";
import { demoCasRepository } from "./demo-repository";
import type { CasAuthContext, CasBootstrapData, CasRepository } from "./types";

const orderStatuses: OrderStatus[] = [
  "New",
  "Unassigned",
  "Assigned",
  "Accepted",
  "Inspection Scheduled",
  "Inspected",
  "Report In Progress",
  "Submitted",
  "In Review",
  "Revisions Needed",
  "Revision Sent to Appraiser",
  "Ready for Delivery",
  "Delivered",
  "Completed",
  "On Hold",
  "Cancelled"
];

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function toCurrency(value: number | null | undefined) {
  return Number(value ?? 0);
}

function toOrderStatus(status: string): OrderStatus {
  return orderStatuses.includes(status as OrderStatus) ? (status as OrderStatus) : "New";
}

function toUserRole(role: string | null | undefined): UserRole {
  const normalized = role ?? "office_staff";
  const roles: UserRole[] = [
    "super_admin",
    "company_admin",
    "office_staff",
    "appraiser",
    "appraiser_manager",
    "reviewer",
    "amc_admin",
    "amc_staff",
    "client_user",
    "solo_appraiser"
  ];
  return roles.includes(normalized as UserRole) ? (normalized as UserRole) : "office_staff";
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? undefined,
    type: row.type,
    status: row.status === "inactive" ? "Suspended" : "Active",
    primaryContact: row.primary_contact ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    logoUrl: row.logo_url ?? undefined,
    brandColor: row.brand_color ?? undefined
  };
}

function mapClient(row: ClientRow, contacts: ClientContactRow[], fees: ClientFeeDefaultRow[]): ClientProfile {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organization_id,
    status: row.status === "inactive" ? "Inactive" : "Active",
    defaultTurnDays: row.default_turn_days ?? 5,
    contacts: contacts.map<ClientContact>((contact) => ({
      id: contact.id,
      name: contact.name,
      title: contact.title ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? ""
    })),
    notes: row.notes ?? "",
    defaultFees: fees.map((fee) => ({ productType: fee.product_type, fee: toCurrency(fee.fee) }))
  };
}

function mapAppraiser(row: AppraiserProfileRow): AppraiserProfile {
  const counties = row.coverage_summary?.split(",").map((county) => county.trim()).filter(Boolean) ?? [];

  return {
    id: row.id,
    name: row.display_name,
    role: row.role === "Panel" || row.role === "Solo" ? row.role : "Staff",
    counties,
    capacity: row.capacity ?? 0,
    activeOrders: row.active_orders ?? 0,
    dueThisWeek: row.due_this_week ?? 0,
    avgTurnDays: row.avg_turn_days ?? 0,
    revisionRate: row.revision_rate ?? 0,
    payoutDue: row.payout_due ?? 0,
    licenseStatus: "Current",
    defaultCommissionSplit: row.default_split_percent ?? undefined
  };
}

function mapVendor(row: VendorProfileRow): VendorProfile {
  return {
    id: row.id,
    company: row.company_name,
    contact: row.contact_name ?? "",
    distance: 0,
    coverage: row.specialties,
    coverageZips: row.coverage_zips,
    radiusMiles: row.radius_miles ?? undefined,
    officeAddress: row.office_address ?? undefined,
    roster: row.roster,
    specialties: row.specialties,
    status: row.status === "pending_documents" ? "Pending documents" : row.status === "under_review" ? "Under review" : "Approved",
    turnTime: row.turn_time_days ?? 0,
    capacity: row.capacity ?? 0,
    workload: row.workload ?? undefined,
    rating: row.rating ?? undefined,
    documents: { w9: "Current", eo: "Current", license: "Current" }
  };
}

function mapOrder(row: OrderRow, clientsById: Map<string, ClientRow>, appraisersById: Map<string, AppraiserProfileRow>): Order {
  const appraiser = row.appraiser_profile_id ? appraisersById.get(row.appraiser_profile_id)?.display_name ?? "Unassigned" : "Unassigned";
  const client = row.client_id ? clientsById.get(row.client_id)?.name ?? "Unknown client" : "Unknown client";

  return {
    id: row.id,
    fileNumber: row.file_number,
    productType: row.product_type,
    client,
    amc: "Direct Lender",
    borrower: row.borrower_name,
    address: row.subject_address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    county: row.county,
    appraiser,
    reviewer: "Unassigned",
    orderedDate: dateOnly(row.ordered_at),
    dueDate: dateOnly(row.due_at),
    inspectionDate: dateOnly(row.inspection_at) || undefined,
    status: toOrderStatus(row.status),
    priority: row.priority === "Rush" || row.priority === "High" || row.priority === "Watch" ? row.priority : "Standard",
    fee: toCurrency(row.fee),
    techFee: toCurrency(row.tech_fee),
    appraiserPayout: toCurrency(row.appraiser_payout),
    documents: 0,
    lastUpdate: row.last_activity_at ? `Updated ${dateOnly(row.last_activity_at)}` : "Synced from Supabase",
    nextAction: row.next_action ?? "Review order",
    loanType: row.loan_type ?? "",
    occupancy: row.occupancy ?? "",
    propertyType: row.property_type ?? "",
    contactName: row.contact_name ?? row.borrower_name,
    contactPhone: row.contact_phone ?? "",
    accessInfo: row.access_info ?? "",
    assignmentPreference: row.assignment_preference ?? "Best workload fit",
    lenderContact: row.lender_contact ?? "",
    parcelNumber: row.parcel_number ?? "",
    timeline: [],
    notes: [],
    clientComments: [],
    documentsList: [],
    assignmentHistory: [],
    revisionLog: [],
    auditTrail: [],
    reviewItems: [],
    commissionSplitOverride: row.commission_split_override ?? undefined,
    paidAt: dateOnly(row.paid_at) || undefined
  };
}

function mapAccounting(row: AccountingEntryRow, ordersById: Map<string, Order>, clientsById: Map<string, ClientRow>, appraisersById: Map<string, AppraiserProfileRow>): AccountingEntry {
  const order = row.order_id ? ordersById.get(row.order_id) : undefined;

  return {
    id: row.id,
    orderId: row.order_id ?? "",
    client: row.client_id ? clientsById.get(row.client_id)?.name ?? "" : order?.client ?? "",
    appraiser: row.appraiser_profile_id ? appraisersById.get(row.appraiser_profile_id)?.display_name ?? "" : order?.appraiser ?? "",
    productType: row.product_type ?? order?.productType ?? "",
    county: row.county ?? order?.county ?? "",
    completedAt: row.completed_at ?? dateOnly(order?.dueDate),
    fee: toCurrency(row.fee ?? row.amount),
    techFee: toCurrency(row.tech_fee),
    commissionSplit: row.commission_split ?? 0,
    appraiserSplit: toCurrency(row.appraiser_split),
    companyRevenue: toCurrency(row.company_revenue),
    status: row.status === "Paid" || row.status === "Unpaid" || row.status === "Ready to invoice" || row.status === "Payout pending" ? row.status : "Unpaid",
    month: row.month ?? dateOnly(row.completed_at).slice(0, 7),
    paidAt: row.paid_at ?? undefined
  };
}

function mapInvoice(row: InvoiceRow, clientsById: Map<string, ClientRow>): Invoice {
  const status = ["Draft", "Issued", "Sent", "Viewed", "Partially Paid", "Paid", "Overdue", "Void"].includes(row.status) ? row.status as Invoice["status"] : "Draft";

  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id ?? undefined,
    invoiceNumber: row.invoice_number,
    client: row.client_id ? clientsById.get(row.client_id)?.name ?? "Unknown client" : "Unknown client",
    billingParty: row.billing_party ?? undefined,
    billToContact: row.bill_to_contact ?? undefined,
    amount: toCurrency(row.amount),
    subtotal: row.subtotal ?? undefined,
    taxAmount: row.tax_amount ?? undefined,
    balanceDue: row.balance_due ?? undefined,
    status,
    dueDate: dateOnly(row.due_at),
    orderCount: row.order_count,
    paymentTerms: row.payment_terms ?? undefined,
    notes: row.notes ?? undefined,
    draftDate: dateOnly(row.draft_at) || undefined,
    issuedDate: dateOnly(row.issued_at) || undefined,
    sentDate: dateOnly(row.sent_at) || undefined,
    viewedDate: dateOnly(row.viewed_at) || undefined,
    paidDate: dateOnly(row.paid_at) || undefined,
    partialPayment: row.partial_payment_amount ?? undefined
  };
}

function mapCalendarPreference(row: CalendarPreferenceRow, appraisersById: Map<string, AppraiserProfileRow>): CalendarPreference {
  return {
    id: row.id,
    appraiser: row.appraiser_profile_id ? appraisersById.get(row.appraiser_profile_id)?.display_name ?? "Unassigned" : "Company calendar",
    googleConnected: row.google_connected,
    syncInspections: row.sync_inspections,
    syncDueDates: row.sync_due_dates
  };
}

function mapOrderFormTemplate(row: OrderFormTemplateRow | undefined): OrderFormTemplate {
  if (!row) return defaultOrderFormTemplate;

  return {
    ...defaultOrderFormTemplate,
    id: row.id,
    name: row.name,
    ownerType: row.owner_type,
    organizationId: row.organization_id ?? undefined,
    updatedAt: dateOnly(row.updated_at)
  };
}

function mapCompanyUser(profile: UserProfileRow, member: OrganizationMemberRow, role: RoleRow | undefined, permissions: PermissionKey[]): CompanyUser {
  return {
    id: member.id,
    name: profile.full_name,
    email: profile.email,
    role: toUserRole(role?.system_key),
    status: member.status === "active" ? "Active" : member.status === "invited" ? "Pending invite" : "Inactive",
    permissions,
    lastActive: member.last_active_at ? dateOnly(member.last_active_at) : "Not active yet"
  };
}

export class SupabaseCasRepository implements CasRepository {
  mode = "supabase" as const;

  async loadBootstrapData(organizationId?: string): Promise<CasBootstrapData> {
    const client = createSupabaseBrowserClient();
    if (!client) {
      return demoCasRepository.loadBootstrapData();
    }

    const orgId = organizationId ?? (await this.resolveActiveOrganizationId());
    if (!orgId) {
      return {
        organizations: [],
        users: [],
        orders: [],
        clients: [],
        companyUsers: [],
        appraisers: [],
        vendors: [],
        vendorDocuments: [],
        accountingEntries: [],
        invoices: [],
        invoiceSettings: [],
        invitations: [],
        publicOrderSettings: [],
        publicOrderRequests: [],
        notificationPreferences: [],
        notificationTemplates: [],
        emailDeliveryRecords: [],
        integrations: [],
        integrationLogs: [],
        orderFormTemplate: defaultOrderFormTemplate,
        calendarPreferences: []
      };
    }

    const [
      organizationsResult,
      clientsResult,
      contactsResult,
      feesResult,
      appraisersResult,
      vendorsResult,
      ordersResult,
      accountingResult,
      invoicesResult,
      formTemplateResult,
      calendarResult,
      membersResult,
      profilesResult,
      rolesResult,
      rolePermissionsResult
    ] = await Promise.all([
      client.from("organizations").select("*"),
      client.from("clients").select("*").eq("organization_id", orgId),
      client.from("client_contacts").select("*").eq("organization_id", orgId),
      client.from("client_fee_defaults").select("*").eq("organization_id", orgId),
      client.from("appraiser_profiles").select("*").eq("organization_id", orgId),
      client.from("vendor_profiles").select("*").eq("amc_organization_id", orgId),
      client.from("orders").select("*").eq("organization_id", orgId),
      client.from("accounting_entries").select("*").eq("organization_id", orgId),
      client.from("invoices").select("*").eq("organization_id", orgId),
      client.from("order_form_templates").select("*").eq("organization_id", orgId).eq("active", true),
      client.from("calendar_preferences").select("*").eq("organization_id", orgId),
      client.from("organization_members").select("*").eq("organization_id", orgId),
      client.from("user_profiles").select("*"),
      client.from("roles").select("*").eq("organization_id", orgId),
      client.from("role_permissions").select("*")
    ]);

    const organizationRows = organizationsResult.data ?? [];
    const clientRows = clientsResult.data ?? [];
    const contactRows = contactsResult.data ?? [];
    const feeRows = feesResult.data ?? [];
    const appraiserRows = appraisersResult.data ?? [];
    const vendorRows = vendorsResult.data ?? [];
    const orderRows = ordersResult.data ?? [];
    const accountingRows = accountingResult.data ?? [];
    const invoiceRows = invoicesResult.data ?? [];
    const templateRows = formTemplateResult.data ?? [];
    const calendarRows = calendarResult.data ?? [];
    const memberRows = membersResult.data ?? [];
    const profileRows = profilesResult.data ?? [];
    const roleRows = rolesResult.data ?? [];
    const rolePermissionRows = rolePermissionsResult.data ?? [];

    const clientsById = new Map(clientRows.map((row) => [row.id, row]));
    const appraisersById = new Map(appraiserRows.map((row) => [row.id, row]));
    const ordersById = new Map<string, Order>();
    const rolesById = new Map(roleRows.map((role) => [role.id, role]));
    const permissionsByRoleId = rolePermissionRows.reduce<Map<string, PermissionKey[]>>((map, row: RolePermissionRow) => {
      if (row.enabled) {
        const permissions = map.get(row.role_id) ?? [];
        permissions.push(row.permission_key as PermissionKey);
        map.set(row.role_id, permissions);
      }
      return map;
    }, new Map());

    const mappedOrders = orderRows.map((row) => {
      const order = mapOrder(row, clientsById, appraisersById);
      ordersById.set(order.id, order);
      return order;
    });

    const companyUsers = memberRows.flatMap<CompanyUser>((member) => {
      const profile = profileRows.find((row) => row.id === member.user_id);
      if (!profile) return [];
      const role = member.role_id ? rolesById.get(member.role_id) : undefined;
      const permissions = member.role_id ? permissionsByRoleId.get(member.role_id) ?? [] : [];
      return [mapCompanyUser(profile, member, role, permissions)];
    });

    return {
      organizations: organizationRows.map(mapOrganization),
      users: companyUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: orgId,
        title: user.role.replaceAll("_", " ")
      })),
      orders: mappedOrders,
      clients: clientRows.map((row) => mapClient(row, contactRows.filter((contact) => contact.client_id === row.id), feeRows.filter((fee) => fee.client_id === row.id))),
      companyUsers,
      appraisers: appraiserRows.map(mapAppraiser),
      vendors: vendorRows.map(mapVendor),
      vendorDocuments: [] as VendorDocument[],
      accountingEntries: accountingRows.map((row) => mapAccounting(row, ordersById, clientsById, appraisersById)),
      invoices: invoiceRows.map((row) => mapInvoice(row, clientsById)),
      invoiceSettings: [],
      invitations: [],
      publicOrderSettings: [],
      publicOrderRequests: [],
      notificationPreferences: [],
      notificationTemplates: [],
      emailDeliveryRecords: [],
      integrations: [],
      integrationLogs: [],
      orderFormTemplate: mapOrderFormTemplate(templateRows[0]),
      calendarPreferences: calendarRows.map((row) => mapCalendarPreference(row, appraisersById))
    };
  }

  async loadAuthContext(): Promise<CasAuthContext> {
    const client = createSupabaseBrowserClient();
    if (!client) {
      return demoCasRepository.loadAuthContext();
    }

    const {
      data: { session }
    } = await client.auth.getSession();

    if (!session?.user) {
      return {
        mode: "supabase",
        isDemo: false,
        user: null,
        organization: null,
        memberships: [],
        permissions: []
      };
    }

    const [profileResult, membersResult] = await Promise.all([
      client.from("user_profiles").select("*").eq("id", session.user.id).maybeSingle(),
      client.from("organization_members").select("*").eq("user_id", session.user.id)
    ]);

    const profile = profileResult.data;
    const members = membersResult.data ?? [];
    const roleIds = members.map((member) => member.role_id).filter(Boolean) as string[];
    const organizationIds = members.map((member) => member.organization_id);

    const [rolesResult, rolePermissionsResult, organizationsResult] = await Promise.all([
      roleIds.length ? client.from("roles").select("*").in("id", roleIds) : Promise.resolve({ data: [] as RoleRow[] }),
      roleIds.length ? client.from("role_permissions").select("*").in("role_id", roleIds) : Promise.resolve({ data: [] as RolePermissionRow[] }),
      organizationIds.length ? client.from("organizations").select("*").in("id", organizationIds) : Promise.resolve({ data: [] as OrganizationRow[] })
    ]);

    const rolesById = new Map((rolesResult.data ?? []).map((role) => [role.id, role]));
    const organizationsById = new Map((organizationsResult.data ?? []).map((organization) => [organization.id, mapOrganization(organization)]));
    const permissionRows = rolePermissionsResult.data ?? [];
    const memberships = members.flatMap((member) => {
      const role = member.role_id ? rolesById.get(member.role_id) : undefined;
      const organization = organizationsById.get(member.organization_id);
      if (!organization) return [];
      const permissions = permissionRows.filter((row) => row.role_id === member.role_id && row.enabled).map((row) => row.permission_key as PermissionKey);
      return [{ organization, role: toUserRole(role?.system_key), permissions, status: member.status }];
    });
    const activeMembership = memberships.find((membership) => membership.status === "active") ?? memberships[0];
    const role = activeMembership?.role ?? "office_staff";
    const fallbackPermissions = getPermissions({
      id: session.user.id,
      name: profile?.full_name ?? session.user.email ?? "CAS user",
      email: session.user.email ?? profile?.email ?? "",
      role,
      organizationId: activeMembership?.organization.id ?? "",
      title: role.replaceAll("_", " ")
    });
    const permissions = activeMembership?.permissions.length ? activeMembership.permissions : fallbackPermissions;

    return {
      mode: "supabase",
      isDemo: false,
      user: {
        id: session.user.id,
        name: profile?.full_name ?? session.user.email ?? "CAS user",
        email: profile?.email ?? session.user.email ?? "",
        role,
        organizationId: activeMembership?.organization.id ?? "",
        title: role.replaceAll("_", " ")
      },
      organization: activeMembership?.organization ?? null,
      memberships,
      permissions
    };
  }

  private async resolveActiveOrganizationId() {
    const client = createSupabaseBrowserClient();
    if (!client) return null;

    const {
      data: { session }
    } = await client.auth.getSession();

    if (!session?.user) return null;

    const { data } = await client.from("organization_members").select("organization_id").eq("user_id", session.user.id).eq("status", "active").limit(1);
    return data?.[0]?.organization_id ?? null;
  }
}
