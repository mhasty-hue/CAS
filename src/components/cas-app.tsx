"use client";

import { useEffect, useState } from "react";
import { appraisers, calendarPreferences, clientProfiles, companyUsers, defaultOrderFormTemplate, orders, vendors } from "@/data/demo";
import {
  accountingEntries,
  deliveryRecords,
  documentAuditEvents,
  emailDeliveryRecords,
  integrationLogs,
  integrationSettings,
  invoiceSettings,
  invoices,
  managedDocuments,
  notificationPreferences,
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
  vendorDocuments
} from "@/data/platform";
import type { AccountingEntry, AppraiserProfile, CalendarPreference, ClientProfile, CompanyUser, DeliveryRecord, DocumentAuditEvent, DocumentCategory, EmailDeliveryRecord, InspectionInfo, IntegrationLog, IntegrationSetting, Invoice, InvoiceSettings, ManagedDocument, MessageChannel, Note, NotificationPreference, NotificationTemplate, Order, OrderFormTemplate, OrderStatus, Organization, OrganizationInvitation, OrderMessage, PermissionKey, PortalUser, PublicOrderRequest, PublicOrderSettings, ReportSubmission, RequiredDocumentRule, RevisionRequest, RevisionStatus, UserRole, VendorDocument, VendorProfile } from "@/types/domain";
import { loadCasAuthContext } from "@/lib/auth/context";
import { createDeliveryRecord } from "@/lib/delivery/service";
import { buildInvoiceFromOrder } from "@/lib/invoicing/service";
import { canCreateOrders, canViewAllOrders, canViewOwnOrdersOnly } from "@/lib/permissions";
import { publicRequestToOrderSeed } from "@/lib/public-intake/service";
import { simulateOrderDocumentUpload } from "@/lib/storage/paths";
import { createOrderMessage } from "@/lib/messaging/service";
import { applyPayrollSnapshot, calculatePayrollSnapshot } from "@/lib/accounting/payroll";
import { getCasRepository } from "@/lib/repositories";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AccountingView, AnalyticsView } from "./cas/accounting";
import { ProductionAccessGate } from "./cas/auth";
import { CalendarView } from "./cas/calendar";
import { ClientsView } from "./cas/clients";
import { demoMode, navCatalog, roleNavigation, type NavId } from "./cas/config";
import { AppraiserPortalView, DashboardView } from "./cas/dashboard";
import { NewOrderView } from "./cas/forms";
import { CommandPalette, Sidebar, Topbar } from "./cas/layout";
import { OrdersView } from "./cas/orders";
import { CompletedReviewsView, ReviewTemplatesView, ReviewView, RevisionsView } from "./cas/review";
import { DocumentsView, MessagesView, NotificationsView, ReportsView } from "./cas/support";
import { SettingsView } from "./cas/users";
import { ComplianceView, VendorInvitesView, VendorView } from "./cas/vendors";

type InspectionAction = "schedule" | "reschedule" | "complete" | "cancel" | "note";

function filterOrdersForUser(orderList: Order[], user: PortalUser, organization: Organization) {
  if (canViewAllOrders(user)) return orderList;
  if (user.appraiserName) return orderList.filter((order) => order.appraiser === user.appraiserName || order.appraiser === "Unassigned");
  if (user.clientName) return orderList.filter((order) => order.client === user.clientName);
  if (organization.type === "amc") return orderList.filter((order) => order.amc === organization.name || order.client === organization.name);
  return orderList.filter((order) => order.client === organization.name || order.appraiser === user.name);
}

export function CasApp() {
  const [activeView, setActiveView] = useState<NavId>("dashboard");
  const [authState, setAuthState] = useState<"loading" | "ready" | "signed-out" | "error">(demoMode ? "ready" : "loading");
  const [authError, setAuthError] = useState("");
  const [runtimeUser, setRuntimeUser] = useState<PortalUser | null>(null);
  const [runtimeOrganization, setRuntimeOrganization] = useState<Organization | null>(null);
  const [orderList, setOrderList] = useState<Order[]>(orders);
  const [appraiserList, setAppraiserList] = useState<AppraiserProfile[]>(appraisers);
  const [clientList, setClientList] = useState<ClientProfile[]>(clientProfiles);
  const [companyUserList, setCompanyUserList] = useState<CompanyUser[]>(companyUsers);
  const [vendorList, setVendorList] = useState<VendorProfile[]>(vendors);
  const [vendorDocumentList, setVendorDocumentList] = useState<VendorDocument[]>(vendorDocuments);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>(invoices);
  const [invoiceSettingsList, setInvoiceSettingsList] = useState<InvoiceSettings[]>(invoiceSettings);
  const [accountingList, setAccountingList] = useState<AccountingEntry[]>(accountingEntries);
  const [invitationList, setInvitationList] = useState<OrganizationInvitation[]>(organizationInvitations);
  const [publicOrderSettingsList, setPublicOrderSettingsList] = useState<PublicOrderSettings[]>(publicOrderSettings);
  const [publicOrderRequestList, setPublicOrderRequestList] = useState<PublicOrderRequest[]>(publicOrderRequests);
  const [notificationPreferenceList, setNotificationPreferenceList] = useState<NotificationPreference[]>(notificationPreferences);
  const [notificationTemplateList, setNotificationTemplateList] = useState<NotificationTemplate[]>(notificationTemplates);
  const [emailDeliveryList, setEmailDeliveryList] = useState<EmailDeliveryRecord[]>(emailDeliveryRecords);
  const [integrationList, setIntegrationList] = useState<IntegrationSetting[]>(integrationSettings);
  const [integrationLogList, setIntegrationLogList] = useState<IntegrationLog[]>(integrationLogs);
  const [managedDocumentList, setManagedDocumentList] = useState<ManagedDocument[]>(managedDocuments);
  const [requiredDocumentRuleList, setRequiredDocumentRuleList] = useState<RequiredDocumentRule[]>(requiredDocumentRules);
  const [orderMessageList, setOrderMessageList] = useState<OrderMessage[]>(orderMessages);
  const [revisionRequestList, setRevisionRequestList] = useState<RevisionRequest[]>(revisionRequests);
  const [reportSubmissionList, setReportSubmissionList] = useState<ReportSubmission[]>(reportSubmissions);
  const [deliveryRecordList, setDeliveryRecordList] = useState<DeliveryRecord[]>(deliveryRecords);
  const [documentAuditEventList, setDocumentAuditEventList] = useState<DocumentAuditEvent[]>(documentAuditEvents);
  const [orderFormTemplate, setOrderFormTemplate] = useState<OrderFormTemplate>(defaultOrderFormTemplate);
  const [calendarPreferenceList, setCalendarPreferenceList] = useState<CalendarPreference[]>(calendarPreferences);
  const [activeUserId, setActiveUserId] = useState(portalUsers[0].id);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0].id);
  const [commandOpen, setCommandOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const demoActiveUser = portalUsers.find((user) => user.id === activeUserId) ?? portalUsers[0];
  const activeUser = demoMode ? demoActiveUser : runtimeUser ?? demoActiveUser;
  const activeOrganization = demoMode
    ? organizations.find((organization) => organization.id === activeUser.organizationId) ?? organizations[0]
    : runtimeOrganization ?? organizations.find((organization) => organization.id === activeUser.organizationId) ?? organizations[0];
  const activeNavItems = roleNavigation[activeUser.role].map((id) => ({ id, ...navCatalog[id] }));
  const visibleOrders = filterOrdersForUser(orderList, activeUser, activeOrganization);
  const selectedOrder = visibleOrders.find((order) => order.id === selectedOrderId) ?? visibleOrders[0] ?? orderList[0];

  function openView(preferred: NavId, fallback: NavId = "dashboard") {
    const navigation = roleNavigation[activeUser.role];
    setActiveView(navigation.includes(preferred) ? preferred : navigation.includes(fallback) ? fallback : "dashboard");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (demoMode) return;
    let canceled = false;

    async function loadProductionWorkspace() {
      if (!isSupabaseConfigured()) {
        setAuthState("error");
        setAuthError("Supabase is not configured. Set environment keys or enable demo mode to continue.");
        return;
      }

      try {
        setAuthState("loading");
        const context = await loadCasAuthContext();
        if (canceled) return;

        if (!context.user || !context.organization) {
          setAuthState("signed-out");
          return;
        }

        setRuntimeUser(context.user);
        setRuntimeOrganization(context.organization);
        setActiveUserId(context.user.id);

        const bootstrap = await getCasRepository("supabase").loadBootstrapData(context.organization.id);
        if (canceled) return;

        setOrderList(bootstrap.orders.length ? bootstrap.orders : orders);
        setClientList(bootstrap.clients.length ? bootstrap.clients : clientProfiles);
        setCompanyUserList(bootstrap.companyUsers.length ? bootstrap.companyUsers : companyUsers);
        setAppraiserList(bootstrap.appraisers.length ? bootstrap.appraisers : appraisers);
        setVendorList(bootstrap.vendors.length ? bootstrap.vendors : vendors);
        setVendorDocumentList(bootstrap.vendorDocuments);
        setAccountingList(bootstrap.accountingEntries.length ? bootstrap.accountingEntries : accountingEntries);
        setInvoiceList(bootstrap.invoices.length ? bootstrap.invoices : invoices);
        setInvoiceSettingsList(bootstrap.invoiceSettings);
        setInvitationList(bootstrap.invitations);
        setPublicOrderSettingsList(bootstrap.publicOrderSettings);
        setPublicOrderRequestList(bootstrap.publicOrderRequests);
        setNotificationPreferenceList(bootstrap.notificationPreferences);
        setNotificationTemplateList(bootstrap.notificationTemplates);
        setEmailDeliveryList(bootstrap.emailDeliveryRecords);
        setIntegrationList(bootstrap.integrations);
        setIntegrationLogList(bootstrap.integrationLogs);
        setManagedDocumentList(bootstrap.managedDocuments);
        setRequiredDocumentRuleList(bootstrap.requiredDocumentRules);
        setOrderMessageList(bootstrap.orderMessages);
        setRevisionRequestList(bootstrap.revisionRequests);
        setReportSubmissionList(bootstrap.reportSubmissions);
        setDeliveryRecordList(bootstrap.deliveryRecords);
        setDocumentAuditEventList(bootstrap.documentAuditEvents);
        setOrderFormTemplate(bootstrap.orderFormTemplate);
        setCalendarPreferenceList(bootstrap.calendarPreferences.length ? bootstrap.calendarPreferences : calendarPreferences);
        setAuthState("ready");
      } catch (error) {
        if (canceled) return;
        setAuthState("error");
        setAuthError(error instanceof Error ? error.message : "CAS could not load production access.");
      }
    }

    void loadProductionWorkspace();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!roleNavigation[activeUser.role].includes(activeView)) {
      setActiveView("dashboard");
    }
  }, [activeUser.role, activeView]);

  const currentTitle = navCatalog[activeView]?.label ?? "Dashboard";

  function updateOrder(orderId: string, updater: (order: Order) => Order) {
    setOrderList((currentOrders) => currentOrders.map((order) => (order.id === orderId ? updater(order) : order)));
  }

  function handleAssignOrder(orderId: string, appraiserName: string, note: string) {
    updateOrder(orderId, (order) => {
      const noteBody = note.trim();
      const assignmentNote: Note | null = noteBody
        ? {
            id: `${order.id}-assignment-note-${Date.now()}`,
            author: "Nora Fields",
            body: noteBody,
            visibility: "internal",
            createdAt: "Just now"
          }
        : null;

      return {
        ...order,
        appraiser: appraiserName,
        status: order.status === "New" || order.status === "Unassigned" ? "Assigned" : order.status,
        nextAction: "Await appraiser acceptance",
        lastUpdate: `Assigned to ${appraiserName}`,
        notes: assignmentNote ? [assignmentNote, ...order.notes] : order.notes,
        assignmentHistory: [
          {
            id: `${order.id}-assigned-${Date.now()}`,
            appraiser: appraiserName,
            action: order.appraiser === "Unassigned" ? "Assigned" : "Reassigned",
            actor: "Nora Fields",
            note: noteBody || "Assigned from CAS workload panel.",
            at: "Just now"
          },
          ...order.assignmentHistory
        ],
        timeline: [
          {
            label: order.appraiser === "Unassigned" ? "Appraiser assigned" : "Appraiser reassigned",
            detail: `${appraiserName} selected from workload panel`,
            at: "Just now",
            actor: "Nora Fields"
          },
          ...order.timeline
        ],
        auditTrail: [
          {
            id: `${order.id}-audit-${Date.now()}`,
            action: `Assigned to ${appraiserName}`,
            actor: "Nora Fields",
            at: "Just now"
          },
          ...order.auditTrail
        ]
      };
    });
  }

  function handleStatusChange(orderId: string, status: OrderStatus) {
    updateOrder(orderId, (order) => ({
      ...order,
      status,
      lastUpdate: `Status changed to ${status}`,
      nextAction: status === "Completed" ? "No action" : order.nextAction,
      timeline: [
        {
          label: "Status updated",
          detail: `${order.status} moved to ${status}`,
          at: "Just now",
          actor: "Nora Fields"
        },
        ...order.timeline
      ],
      auditTrail: [
        {
          id: `${order.id}-status-${Date.now()}`,
          action: `Status changed from ${order.status} to ${status}`,
          actor: "Nora Fields",
          at: "Just now"
        },
        ...order.auditTrail
      ]
    }));
  }

  function handleAddNote(orderId: string) {
    updateOrder(orderId, (order) => ({
      ...order,
      lastUpdate: "Internal note added",
      notes: [
        {
          id: `${order.id}-note-${Date.now()}`,
          author: "Nora Fields",
          body: "Followed up on current next action from the orders worklist.",
          visibility: "internal",
          createdAt: "Just now"
        },
        ...order.notes
      ],
      auditTrail: [
        {
          id: `${order.id}-note-audit-${Date.now()}`,
          action: "Internal note added",
          actor: "Nora Fields",
          at: "Just now"
        },
        ...order.auditTrail
      ]
    }));
  }

  function handleCreateOrder(kind: "internal" | "client" | "amc", templateName = orderFormTemplate.name) {
    const nextNumber = `CAA-26-${1060 + orderList.length}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      fileNumber: nextNumber,
      productType: kind === "amc" ? "FHA 1004" : "1004 URAR",
      client: activeUser.clientName ?? activeOrganization.name,
      amc: activeOrganization.type === "amc" ? activeOrganization.name : "Direct Lender",
      borrower: kind === "client" ? "New Client Borrower" : "New Intake Borrower",
      address: "1220 Portal Created Drive",
      city: "Atlanta",
      state: "GA",
      zip: "30339",
      county: "Cobb",
      appraiser: "Unassigned",
      reviewer: "Maya Chen",
      orderedDate: "2026-07-06",
      dueDate: "2026-07-11",
      status: "New",
      priority: kind === "amc" ? "High" : "Standard",
      fee: kind === "amc" ? 625 : 575,
      techFee: 35,
      appraiserPayout: 0,
      documents: 2,
      lastUpdate: `Created by ${activeUser.name}`,
      nextAction: "Review intake and assign",
      loanType: "Conventional",
      occupancy: "Primary residence",
      propertyType: "Single family",
      contactName: activeUser.name,
      contactPhone: activeOrganization.phone,
      accessInfo: "Portal order placeholder. Confirm access before assignment.",
      assignmentPreference: "Best workload fit",
      lenderContact: activeUser.name,
      parcelNumber: "Pending",
      timeline: [
        {
          label: "Order placed",
          detail: `${activeOrganization.name} submitted the order through the portal`,
          at: "Just now",
          actor: activeUser.name
        }
      ],
      notes: [
        {
          id: `${Date.now()}-note`,
          author: activeUser.name,
          body: `Created from ${templateName} intake template.`,
          visibility: kind === "client" ? "client" : "internal",
          createdAt: "Just now"
        }
      ],
      clientComments: [],
      documentsList: [
        {
          id: `${nextNumber}-engagement`,
          name: "Engagement letter placeholder.pdf",
          type: "Engagement",
          status: "Needs review",
          uploadedBy: activeUser.name,
          uploadedAt: "Just now"
        }
      ],
      assignmentHistory: [],
      revisionLog: [],
      auditTrail: [
        {
          id: `${nextNumber}-audit`,
          action: "Portal order created",
          actor: activeUser.name,
          at: "Just now"
        }
      ],
      reviewItems: []
    };

    setOrderList((currentOrders) => [newOrder, ...currentOrders]);
    setSelectedOrderId(newOrder.id);
    setActiveView(canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders");
  }

  function handleInviteVendor() {
    setVendorList((currentVendors) => [
      {
        id: `ven-${Date.now()}`,
        company: "Invited Regional Appraisal Co.",
        contact: "Pending contact",
        distance: 14.6,
        coverage: ["Cobb", "Fulton"],
        coverageZips: ["30064", "30339"],
        radiusMiles: 35,
        officeAddress: "Invitation pending",
        roster: ["Pending roster"],
        specialties: ["Conventional", "FHA"],
        status: "Invited",
        turnTime: 6,
        capacity: 8,
        workload: 2,
        rating: 0,
        feeSheet: [{ product: "1004 URAR", fee: 575, turnDays: 6 }],
        documents: { w9: "Missing", eo: "Missing", license: "Missing" }
      },
      ...currentVendors
    ]);
    setActiveView("vendor-invites");
  }

  function handleVendorDocumentStatus(vendorId: string, documentType: VendorDocument["type"], status: VendorDocument["status"]) {
    setVendorDocumentList((currentDocuments) => {
      const existing = currentDocuments.find((document) => document.vendorId === vendorId && document.type === documentType);
      if (!existing) {
        return [
          { id: `${vendorId}-${documentType}`, vendorId, type: documentType, status, uploadedAt: "Just now" },
          ...currentDocuments
        ];
      }

      return currentDocuments.map((document) => (document.id === existing.id ? { ...document, status, uploadedAt: "Just now" } : document));
    });
  }

  function handleReviewAction(orderId: string, action: "return" | "approve" | "deliver") {
    const status: OrderStatus = action === "return" ? "Revisions Needed" : action === "approve" ? "Ready for Delivery" : "Delivered";
    updateOrder(orderId, (order) => ({
      ...order,
      status,
      lastUpdate: action === "return" ? "Returned to appraiser" : action === "approve" ? "Approved by reviewer" : "Delivered to client",
      nextAction: action === "return" ? "Appraiser response needed" : action === "approve" ? "Deliver final report" : "Invoice order",
      timeline: [
        {
          label: action === "return" ? "Returned to appraiser" : action === "approve" ? "Review approved" : "Report delivered",
          detail: `${activeUser.name} updated review workflow`,
          at: "Just now",
          actor: activeUser.name
        },
        ...order.timeline
      ],
      revisionLog: action === "return"
        ? [
            {
              id: `${order.id}-review-return-${Date.now()}`,
              requestedBy: activeUser.name,
              summary: "Reviewer returned report with template comments.",
              status: "Open",
              requestedAt: "Just now"
            },
            ...order.revisionLog
          ]
        : order.revisionLog
    }));
  }

  function handleCompleteReviewItem(orderId: string, label: string) {
    updateOrder(orderId, (order) => ({
      ...order,
      lastUpdate: `Reviewer completed ${label}`,
      reviewItems: order.reviewItems.map((item) => (item.label === label ? { ...item, complete: true } : item)),
      auditTrail: [
        {
          id: `${order.id}-review-item-${Date.now()}`,
          action: `Review checklist item completed: ${label}`,
          actor: activeUser.name,
          at: "Just now"
        },
        ...order.auditTrail
      ]
    }));
  }

  function handleReviewerComment(orderId: string) {
    handleSendOrderMessage(orderId, "Reviewer comment", "Reviewer added a structured comment from the review drawer.");
    updateOrder(orderId, (order) => ({
      ...order,
      lastUpdate: "Reviewer comment added",
      notes: [
        {
          id: `${order.id}-review-comment-${Date.now()}`,
          author: activeUser.name,
          body: "Reviewer comment added from the review queue drawer.",
          visibility: "internal",
          createdAt: "Just now"
        },
        ...order.notes
      ]
    }));
  }

  function handleUpdateDefaultSplit(appraiserName: string, split: number) {
    const nextAppraisers = appraiserList.map((appraiser) =>
      appraiser.name === appraiserName ? { ...appraiser, defaultCommissionSplit: split } : appraiser
    );
    setAppraiserList(nextAppraisers);
    setAccountingList((current) =>
      current.map((entry) =>
        entry.appraiser === appraiserName
          ? applyPayrollSnapshot({ ...entry, defaultAppraiserSplit: split }, nextAppraisers, orderList.find((order) => order.id === entry.orderId))
          : entry
      )
    );
  }

  function handleOverrideCommission(orderId: string, split: number) {
    setAccountingList((current) =>
      current.map((entry) =>
        entry.orderId === orderId
          ? applyPayrollSnapshot({ ...entry, orderSplitOverride: split, commissionSplit: split }, appraiserList, orderList.find((order) => order.id === orderId))
          : entry
      )
    );
    updateOrder(orderId, (order) => {
      if (order.payrollSnapshot?.locked || order.paidAt) return order;
      const appraiser = appraiserList.find((item) => item.name === order.appraiser);
      const snapshot = calculatePayrollSnapshot({
        grossFee: order.fee,
        techFee: order.techFee,
        otherNonCommissionableFees: order.otherNonCommissionableFees ?? 0,
        defaultAppraiserSplit: appraiser?.defaultCommissionSplit,
        orderSplitOverride: split,
        fixedPayoutOverride: order.fixedAppraiserPayoutOverride
      });
      return {
        ...order,
        commissionSplitOverride: split,
        payrollSnapshot: snapshot,
        appraiserPayout: snapshot.finalPayout ?? 0,
        lastUpdate: `Commission override set to ${split}%`,
        auditTrail: [
          {
            id: `${order.id}-commission-${Date.now()}`,
            action: `Order commission split override set to ${split}%`,
            actor: activeUser.name,
            at: "Just now"
          },
          ...order.auditTrail
        ]
      };
    });
  }

  function handleFixedPayoutOverride(orderId: string, payout: number) {
    setAccountingList((current) =>
      current.map((entry) =>
        entry.orderId === orderId
          ? applyPayrollSnapshot({ ...entry, fixedPayoutOverride: payout, manualAdjustmentReason: "Fixed payout override set in accounting workspace." }, appraiserList, orderList.find((order) => order.id === orderId))
          : entry
      )
    );
    updateOrder(orderId, (order) => {
      if (order.payrollSnapshot?.locked || order.paidAt) return order;
      const appraiser = appraiserList.find((item) => item.name === order.appraiser);
      const snapshot = calculatePayrollSnapshot({
        grossFee: order.fee,
        techFee: order.techFee,
        otherNonCommissionableFees: order.otherNonCommissionableFees ?? 0,
        defaultAppraiserSplit: appraiser?.defaultCommissionSplit,
        orderSplitOverride: order.commissionSplitOverride,
        fixedPayoutOverride: payout,
        manualAdjustmentReason: "Fixed payout override set in accounting workspace."
      });
      return {
        ...order,
        fixedAppraiserPayoutOverride: payout,
        payrollSnapshot: snapshot,
        appraiserPayout: snapshot.finalPayout ?? 0,
        lastUpdate: `Fixed payout override set to $${payout}`,
        auditTrail: [
          {
            id: `${order.id}-fixed-payout-${Date.now()}`,
            action: `Fixed payout override set to $${payout}`,
            actor: activeUser.name,
            at: "Just now"
          },
          ...order.auditTrail
        ]
      };
    });
  }

  function handleMarkPayrollPaid(entryIds: string[]) {
    const ids = new Set(entryIds);
    setAccountingList((current) =>
      current.map((entry) =>
        ids.has(entry.id)
          ? {
              ...entry,
              status: "Paid",
              paidAt: "2026-07-08",
              approvedBy: activeUser.name,
              approvedDate: "2026-07-08",
              locked: true,
              payrollSnapshot: {
                grossFee: entry.fee,
                techFee: entry.techFee,
                otherNonCommissionableFees: entry.otherNonCommissionableFees ?? 0,
                commissionableBase: entry.commissionableBase ?? Math.max(0, entry.fee - entry.techFee - (entry.otherNonCommissionableFees ?? 0)),
                defaultAppraiserSplit: entry.defaultAppraiserSplit,
                orderSplitOverride: entry.orderSplitOverride,
                fixedPayoutOverride: entry.fixedPayoutOverride,
                calculatedPayout: entry.calculatedPayout,
                finalPayout: entry.finalPayout ?? entry.appraiserSplit,
                calculationSource: entry.calculationSource ?? "Requires review",
                manualAdjustmentReason: entry.manualAdjustmentReason,
                approvedBy: activeUser.name,
                approvedDate: "2026-07-08",
                locked: true
              }
            }
          : entry
      )
    );
  }

  function handleExportPayrollCsv(entriesToExport: AccountingEntry[]) {
    const rows = [
      ["Order", "Completed", "Client", "Appraiser", "Product", "County", "Gross fee", "Tech fee", "Other noncommissionable", "Commissionable base", "Split", "Fixed payout", "Final payout", "Calculation source", "Status"],
      ...entriesToExport.map((entry) => [
        entry.orderId,
        entry.completedAt,
        entry.client,
        entry.appraiser,
        entry.productType,
        entry.county,
        String(entry.fee),
        String(entry.techFee),
        String(entry.otherNonCommissionableFees ?? 0),
        String(entry.commissionableBase ?? Math.max(0, entry.fee - entry.techFee - (entry.otherNonCommissionableFees ?? 0))),
        `${entry.commissionSplit}%`,
        entry.fixedPayoutOverride ? String(entry.fixedPayoutOverride) : "",
        String(entry.finalPayout ?? entry.appraiserSplit),
        entry.calculationSource ?? "Requires review",
        entry.status
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cas-payroll-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleUpdateInspection(orderId: string, inspection: InspectionInfo, action: InspectionAction, note: string) {
    const label = action === "complete"
      ? "Inspection completed"
      : action === "cancel"
        ? "Inspection cancelled"
        : action === "note"
          ? "Inspection note updated"
          : action === "reschedule"
            ? "Inspection rescheduled"
            : "Inspection scheduled";
    updateOrder(orderId, (order) => {
      const nextStatus: OrderStatus = action === "complete"
        ? "Inspected"
        : action === "cancel"
          ? "Accepted"
          : action === "note"
            ? order.status
            : "Inspection Scheduled";
      const noteBody = note.trim();
      return {
        ...order,
        inspection,
        inspectionDate: action === "cancel" ? undefined : inspection.scheduledDate,
        status: nextStatus,
        lastUpdate: label,
        nextAction: action === "complete" ? "Continue report production" : action === "cancel" ? "Reschedule inspection" : order.nextAction,
        notes: noteBody
          ? [
              {
                id: `${order.id}-inspection-note-${Date.now()}`,
                author: activeUser.name,
                body: noteBody,
                visibility: "internal",
                createdAt: "Just now"
              },
              ...order.notes
            ]
          : order.notes,
        timeline: [
          {
            label,
            detail: inspection.scheduledDate ? `${inspection.scheduledDate} ${inspection.scheduledStartTime ?? ""}`.trim() : "Inspection date cleared",
            at: "Just now",
            actor: activeUser.name
          },
          ...order.timeline
        ],
        auditTrail: [
          {
            id: `${order.id}-inspection-${Date.now()}`,
            action: `${label}${noteBody ? `: ${noteBody}` : ""}`,
            actor: activeUser.name,
            at: "Just now"
          },
          ...order.auditTrail
        ]
      };
    });
  }

  function handleReopenOrder(orderId: string, reason: string) {
    updateOrder(orderId, (order) => ({
      ...order,
      status: "Assigned",
      lastUpdate: "Order reopened",
      nextAction: "Confirm reopened order owner",
      timeline: [
        {
          label: "Order reopened",
          detail: reason,
          at: "Just now",
          actor: activeUser.name
        },
        ...order.timeline
      ],
      auditTrail: [
        {
          id: `${order.id}-reopen-${Date.now()}`,
          action: `Order reopened: ${reason}`,
          actor: activeUser.name,
          at: "Just now"
        },
        ...order.auditTrail
      ]
    }));
  }

  function handleAddClient() {
    const newClient: ClientProfile = {
      id: `client-${Date.now()}`,
      name: `New Client ${clientList.length + 1}`,
      organizationId: activeOrganization.id,
      status: "Active",
      defaultTurnDays: 6,
      contacts: [
        { id: `contact-${Date.now()}`, name: "New contact", title: "Order desk", email: "orders@example.com", phone: "(404) 555-0101" }
      ],
      notes: "New client added during this demo session.",
      defaultFees: [
        { productType: "1004 URAR", fee: 575 },
        { productType: "FHA 1004", fee: 650 }
      ]
    };
    setClientList((current) => [newClient, ...current]);
  }

  function handleUpdateClient(clientId: string, patch: Partial<ClientProfile>) {
    setClientList((current) => current.map((client) => (client.id === clientId ? { ...client, ...patch } : client)));
  }

  function handleInviteCompanyUser() {
    const invitation: OrganizationInvitation = {
      id: `invite-${Date.now()}`,
      organizationId: activeOrganization.id,
      email: `invite${invitationList.length + 1}@${activeOrganization.slug ?? "cas"}.example`,
      invitedName: "Pending teammate",
      role: "office_staff",
      permissions: ["view_all_orders", "create_orders"],
      status: "Pending",
      token: `invite-${Date.now()}`,
      invitedBy: activeUser.name,
      expiresAt: "2026-07-24",
      note: "Created from company user management."
    };
    setInvitationList((current) => [invitation, ...current]);
    setCompanyUserList((current) => [
      {
        id: `company-user-${Date.now()}`,
        name: "Pending teammate",
        email: `invite${current.length + 1}@caavaluation.example`,
        role: "office_staff",
        status: "Pending invite",
        permissions: ["view_all_orders", "create_orders"],
        lastActive: "Invite sent just now"
      },
      ...current
    ]);
  }

  function handleChangeCompanyUserRole(userId: string, role: UserRole) {
    setCompanyUserList((current) => current.map((companyUser) => (companyUser.id === userId ? { ...companyUser, role } : companyUser)));
  }

  function handleToggleCompanyUserPermission(userId: string, permission: PermissionKey) {
    setCompanyUserList((current) =>
      current.map((companyUser) => {
        if (companyUser.id !== userId) return companyUser;
        const hasPermission = companyUser.permissions.includes(permission);
        return {
          ...companyUser,
          permissions: hasPermission
            ? companyUser.permissions.filter((item) => item !== permission)
            : [...companyUser.permissions, permission]
        };
      })
    );
  }

  function handleUpdateInvitationStatus(invitationId: string, status: OrganizationInvitation["status"]) {
    setInvitationList((current) =>
      current.map((invitation) =>
        invitation.id === invitationId
          ? {
              ...invitation,
              status,
              acceptedAt: status === "Accepted" ? "Just now" : invitation.acceptedAt,
              revokedAt: status === "Revoked" ? "Just now" : invitation.revokedAt
            }
          : invitation
      )
    );
  }

  function handleTogglePublicOrdering(organizationId: string) {
    setPublicOrderSettingsList((current) =>
      current.map((settings) => (settings.organizationId === organizationId ? { ...settings, enabled: !settings.enabled, updatedAt: "Just now" } : settings))
    );
  }

  function handleUpdatePublicConfirmation(organizationId: string, confirmationMessage: string) {
    setPublicOrderSettingsList((current) =>
      current.map((settings) => (settings.organizationId === organizationId ? { ...settings, confirmationMessage, updatedAt: "Just now" } : settings))
    );
  }

  function handleToggleNotificationPreference(preferenceId: string, channel: "emailEnabled" | "inAppEnabled") {
    setNotificationPreferenceList((current) =>
      current.map((preference) => (preference.id === preferenceId ? { ...preference, [channel]: !preference[channel] } : preference))
    );
  }

  function handleGenerateInvoice(orderId: string) {
    const order = orderList.find((item) => item.id === orderId);
    if (!order) return;
    const settings = invoiceSettingsList.find((item) => item.organizationId === activeOrganization.id);
    const invoice = buildInvoiceFromOrder(order, activeOrganization, settings, invoiceList.length);
    setInvoiceList((current) => [invoice, ...current]);
    updateOrder(order.id, (currentOrder) => ({
      ...currentOrder,
      lastUpdate: `Invoice ${invoice.invoiceNumber} generated`,
      auditTrail: [
        {
          id: `${currentOrder.id}-invoice-${Date.now()}`,
          action: `Generated draft invoice ${invoice.invoiceNumber}`,
          actor: activeUser.name,
          at: "Just now"
        },
        ...currentOrder.auditTrail
      ]
    }));
  }

  function handleMarkInvoicePaid(invoiceId: string) {
    setInvoiceList((current) =>
      current.map((invoice) =>
        invoice.id === invoiceId
          ? { ...invoice, status: "Paid", paidDate: "Just now", balanceDue: 0, partialPayment: undefined }
          : invoice
      )
    );
  }

  function handleConvertPublicRequest(requestId: string) {
    const request = publicOrderRequestList.find((item) => item.id === requestId);
    if (!request) return;
    const seed = publicRequestToOrderSeed(request);
    const nextNumber = `CAA-PUB-${2000 + orderList.length}`;
    const newOrder: Order = {
      id: `ord-public-${Date.now()}`,
      fileNumber: nextNumber,
      productType: "Private appraisal consultation",
      client: request.requesterName,
      amc: "Direct private client",
      borrower: seed.borrower,
      address: seed.address,
      city: seed.city,
      state: seed.state,
      zip: seed.zip,
      county: "Pending",
      appraiser: "Unassigned",
      reviewer: "Maya Chen",
      orderedDate: "2026-07-10",
      dueDate: "2026-07-17",
      status: "New",
      priority: request.requestedTiming.toLowerCase().includes("week") ? "High" : "Standard",
      fee: 0,
      techFee: 0,
      appraiserPayout: 0,
      documents: request.documentCount,
      lastUpdate: "Converted from public request",
      nextAction: seed.nextAction,
      loanType: seed.loanType,
      occupancy: "Unknown",
      propertyType: seed.propertyType,
      contactName: seed.contactName,
      contactPhone: seed.contactPhone,
      accessInfo: seed.accessInfo,
      assignmentPreference: seed.assignmentPreference,
      lenderContact: seed.lenderContact,
      parcelNumber: "Pending",
      timeline: [
        {
          label: "Public request converted",
          detail: `${request.requesterName} request moved into order workflow`,
          at: "Just now",
          actor: activeUser.name
        }
      ],
      notes: [
        {
          id: `${request.id}-note`,
          author: "CAS Public Intake",
          body: request.comments || "Public request converted. Staff should complete professional fields.",
          visibility: "internal",
          createdAt: "Just now"
        }
      ],
      clientComments: [],
      documentsList: [],
      assignmentHistory: [],
      revisionLog: [],
      auditTrail: [
        ...request.auditTrail,
        {
          id: `${request.id}-converted`,
          action: `Converted to ${nextNumber}`,
          actor: activeUser.name,
          at: "Just now"
        }
      ],
      reviewItems: []
    };

    setOrderList((current) => [newOrder, ...current]);
    setPublicOrderRequestList((current) =>
      current.map((item) => (item.id === requestId ? { ...item, status: "Converted", convertedOrderId: newOrder.id } : item))
    );
    setSelectedOrderId(newOrder.id);
    openView(canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders", "dashboard");
  }

  function handleDeactivateCompanyUser(userId: string) {
    setCompanyUserList((current) =>
      current.map((companyUser) =>
        companyUser.id === userId
          ? { ...companyUser, status: companyUser.status === "Inactive" ? "Active" : "Inactive" }
          : companyUser
      )
    );
  }

  function handleToggleCalendarPreference(preferenceId: string, key: keyof Pick<CalendarPreference, "googleConnected" | "syncInspections" | "syncDueDates">) {
    setCalendarPreferenceList((current) =>
      current.map((preference) =>
        preference.id === preferenceId ? { ...preference, [key]: !preference[key] } : preference
      )
    );
  }

  function addDocumentAuditEvent(event: DocumentAuditEvent) {
    setDocumentAuditEventList((current) => [event, ...current]);
  }

  function handleUploadDocument(orderId: string, category: DocumentCategory) {
    const order = orderList.find((item) => item.id === orderId);
    if (!order) return;
    const extension = category === "Appraisal XML" ? "xml" : category === "ENV file" ? "env" : "pdf";
    const fileName = `${order.fileNumber}-${category.toLowerCase().replaceAll(" ", "-")}.${extension}`;
    const document = simulateOrderDocumentUpload({ organization: activeOrganization, order, user: activeUser, category, fileName });
    setManagedDocumentList((current) => [document, ...current]);
    updateOrder(orderId, (currentOrder) => ({
      ...currentOrder,
      documents: currentOrder.documents + 1,
      lastUpdate: `${category} uploaded`,
      timeline: [{ label: "Document uploaded", detail: document.displayName, at: "Just now", actor: activeUser.name }, ...currentOrder.timeline]
    }));
    addDocumentAuditEvent({
      id: `audit-${Date.now()}`,
      organizationId: activeOrganization.id,
      orderId,
      documentId: document.id,
      event: "Uploaded",
      actor: activeUser.name,
      at: "Just now",
      detail: `${document.displayName} uploaded to secure storage path.`
    });
  }

  function handleArchiveDocument(documentId: string) {
    setManagedDocumentList((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, status: "Archived", auditMetadata: { ...document.auditMetadata, lastAction: "Archived", lastActionAt: "Just now" } }
          : document
      )
    );
    addDocumentAuditEvent({ id: `audit-${Date.now()}`, organizationId: activeOrganization.id, documentId, event: "Archived", actor: activeUser.name, at: "Just now", detail: "Document archived in demo state." });
  }

  function handleRestoreDocument(documentId: string) {
    setManagedDocumentList((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, status: "Uploaded", auditMetadata: { ...document.auditMetadata, lastAction: "Restored", lastActionAt: "Just now" } }
          : document
      )
    );
    addDocumentAuditEvent({ id: `audit-${Date.now()}`, organizationId: activeOrganization.id, documentId, event: "Restored", actor: activeUser.name, at: "Just now", detail: "Document restored from archive." });
  }

  function handleReplaceDocumentVersion(documentId: string) {
    setManagedDocumentList((current) =>
      current.map((document) => {
        if (document.id !== documentId) return document;
        const nextVersion = document.versionNumber + 1;
        return {
          ...document,
          versionNumber: nextVersion,
          status: document.category === "Appraisal report PDF" ? "Final" : document.status,
          fileName: document.fileName.replace(/-v\d+/i, `-v${nextVersion}`),
          auditMetadata: { ...document.auditMetadata, lastAction: "Version replaced", lastActionAt: "Just now" },
          versions: [
            {
              id: `${document.id}-v${nextVersion}`,
              documentId: document.id,
              versionNumber: nextVersion,
              fileName: document.fileName,
              storagePath: document.storagePath,
              uploadedBy: activeUser.name,
              uploadedAt: "Just now",
              checksum: `sha256-demo-${Date.now()}`,
              changeNote: "Version replaced from order document workspace."
            },
            ...document.versions
          ]
        };
      })
    );
    addDocumentAuditEvent({ id: `audit-${Date.now()}`, organizationId: activeOrganization.id, documentId, event: "Version replaced", actor: activeUser.name, at: "Just now", detail: "New document version uploaded." });
  }

  function handleSubmitReport(orderId: string) {
    const orderDocuments = managedDocumentList.filter((document) => document.orderId === orderId);
    const submission: ReportSubmission = {
      id: `submission-${Date.now()}`,
      organizationId: activeOrganization.id,
      orderId,
      submittedBy: activeUser.name,
      submittedAt: "Just now",
      reportPdfDocumentId: orderDocuments.find((document) => document.category === "Appraisal report PDF")?.id,
      xmlDocumentId: orderDocuments.find((document) => document.category === "Appraisal XML")?.id,
      envDocumentId: orderDocuments.find((document) => document.category === "ENV file")?.id,
      supportingDocumentIds: orderDocuments.filter((document) => ["Workfile", "Photos", "Sketch"].includes(document.category)).map((document) => document.id),
      submissionNote: "Submitted from Phase 8 report workflow with certification.",
      certificationAccepted: true,
      status: "Submitted"
    };
    setReportSubmissionList((current) => [submission, ...current]);
    handleStatusChange(orderId, "Submitted");
    setOrderMessageList((current) => [createOrderMessage(orderList.find((order) => order.id === orderId) ?? orderList[0], activeUser, "System activity", "Final report package submitted for review."), ...current]);
  }

  function handleDeliverReport(orderId: string) {
    const order = orderList.find((item) => item.id === orderId);
    if (!order) return;
    const delivery = createDeliveryRecord(order, activeUser, managedDocumentList);
    setDeliveryRecordList((current) => [delivery, ...current]);
    handleStatusChange(orderId, "Delivered");
    addDocumentAuditEvent({ id: `audit-${Date.now()}`, organizationId: activeOrganization.id, orderId, event: "Delivered", actor: activeUser.name, at: "Just now", detail: `Secure delivery created for ${delivery.recipientName}.` });
  }

  function handleSendOrderMessage(orderId: string, channel: MessageChannel, body: string) {
    const order = orderList.find((item) => item.id === orderId);
    if (!order) return;
    const message = createOrderMessage(order, activeUser, channel, body);
    setOrderMessageList((current) => [message, ...current]);
    addDocumentAuditEvent({ id: `audit-${Date.now()}`, organizationId: activeOrganization.id, orderId, messageId: message.id, event: "Message sent", actor: activeUser.name, at: "Just now", detail: `${channel} sent.` });
  }

  function handleToggleMessagePinned(messageId: string) {
    setOrderMessageList((current) => current.map((message) => (message.id === messageId ? { ...message, pinned: !message.pinned } : message)));
  }

  function handleToggleMessageRead(messageId: string) {
    setOrderMessageList((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;
        const read = message.readBy.includes(activeUser.name);
        return { ...message, readBy: read ? message.readBy.filter((name) => name !== activeUser.name) : [...message.readBy, activeUser.name] };
      })
    );
  }

  function handleUpdateRevisionStatus(revisionId: string, status: RevisionStatus) {
    setRevisionRequestList((current) =>
      current.map((revision) =>
        revision.id === revisionId
          ? { ...revision, status, auditTrail: [{ id: `${revision.id}-status-${Date.now()}`, action: `Revision moved to ${status}`, actor: activeUser.name, at: "Just now" }, ...revision.auditTrail] }
          : revision
      )
    );
  }

  function handleRespondToRevisionItem(revisionId: string, itemId: string) {
    setRevisionRequestList((current) =>
      current.map((revision) =>
        revision.id === revisionId
          ? {
              ...revision,
              status: "Response Submitted",
              items: revision.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      completed: true,
                      response: item.response || "Appraiser response added from structured revision workflow.",
                      history: [{ at: "Just now", actor: activeUser.name, action: "Revision item response submitted" }, ...item.history]
                    }
                  : item
              )
            }
          : revision
      )
    );
    addDocumentAuditEvent({ id: `audit-${Date.now()}`, organizationId: activeOrganization.id, revisionId, event: "Revision responded to", actor: activeUser.name, at: "Just now", detail: "Revision item response submitted." });
  }

  if (!demoMode && authState !== "ready") {
    return <ProductionAccessGate state={authState === "loading" ? "loading" : authState === "signed-out" ? "signed-out" : "error"} detail={authError} />;
  }

  return (
    <div className="min-h-screen bg-canvas text-slate-950 lg:grid lg:grid-cols-[264px_1fr]">
      <Sidebar
        activeView={activeView}
        navItems={activeNavItems}
        user={activeUser}
        organization={activeOrganization}
        onNavigate={setActiveView}
      />
      <div className="min-w-0">
        <Topbar
          title={currentTitle}
          user={activeUser}
          organization={activeOrganization}
          query={globalQuery}
          setQuery={setGlobalQuery}
          onCommand={() => setCommandOpen(true)}
          onUserChange={setActiveUserId}
        />
        <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          {activeView === "dashboard" && (
            <DashboardView
              orderList={visibleOrders}
              appraisers={appraiserList}
              user={activeUser}
              organization={activeOrganization}
              vendors={vendorList}
              vendorDocuments={vendorDocumentList}
              accountingEntries={accountingList}
              invoices={invoiceList}
              onOpenOrders={() => setActiveView(canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders")}
              onPlaceOrder={() => setActiveView(["amc_admin", "amc_staff", "client_user", "solo_appraiser"].includes(activeUser.role) ? "place-order" : canCreateOrders(activeUser) ? "new-order" : "orders")}
              onInviteVendor={handleInviteVendor}
              onOpenReview={() => openView(activeUser.role === "reviewer" ? "review-queue" : "review", "orders")}
              onOpenAccounting={() => openView(activeUser.role === "appraiser" || activeUser.role === "solo_appraiser" ? "pay" : "accounting", "dashboard")}
              onOpenClients={() => openView("clients", "orders")}
              onOpenVendors={() => openView(activeUser.role === "amc_admin" || activeUser.role === "amc_staff" ? "compliance" : "vendors", "orders")}
              onOpenMessages={() => openView("messages", "notifications")}
              onOpenDocuments={() => openView("documents", "orders")}
              onOpenCalendar={() => openView("calendar", "orders")}
            />
          )}
          {(activeView === "orders" || activeView === "my-orders" || activeView === "completed-orders" || activeView === "cancelled-orders" || activeView === "all-orders") && (
            <OrdersView
              orderList={visibleOrders}
              selectedOrder={selectedOrder}
              workspace={activeView === "completed-orders" ? "completed" : activeView === "cancelled-orders" ? "cancelled" : activeView === "all-orders" ? "all" : activeView === "my-orders" ? "mine" : "active"}
              user={activeUser}
              onSelectOrder={(order) => setSelectedOrderId(order.id)}
              onSwitchWorkspace={(workspace) => {
                const target: NavId = workspace === "completed" ? "completed-orders" : workspace === "cancelled" ? "cancelled-orders" : workspace === "all" ? "all-orders" : canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders";
                openView(target, canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders");
              }}
              onAssignOrder={handleAssignOrder}
              onStatusChange={handleStatusChange}
              onReopenOrder={handleReopenOrder}
              onUpdateInspection={handleUpdateInspection}
              onAddNote={handleAddNote}
              onGenerateInvoice={handleGenerateInvoice}
              managedDocuments={managedDocumentList}
              requiredDocumentRules={requiredDocumentRuleList}
              orderMessages={orderMessageList}
              revisionRequests={revisionRequestList}
              deliveryRecords={deliveryRecordList}
              onUploadDocument={handleUploadDocument}
              onArchiveDocument={handleArchiveDocument}
              onRestoreDocument={handleRestoreDocument}
              onReplaceDocumentVersion={handleReplaceDocumentVersion}
              onSubmitReport={handleSubmitReport}
              onDeliverReport={handleDeliverReport}
              onSendMessage={handleSendOrderMessage}
              onToggleMessagePinned={handleToggleMessagePinned}
              onToggleMessageRead={handleToggleMessageRead}
              onUpdateRevisionStatus={handleUpdateRevisionStatus}
              onRespondToRevisionItem={handleRespondToRevisionItem}
            />
          )}
          {(activeView === "new-order" || activeView === "place-order") && (
            <NewOrderView
              user={activeUser}
              organization={activeOrganization}
              template={orderFormTemplate}
              onTemplateChange={setOrderFormTemplate}
              onRestoreTemplate={() => setOrderFormTemplate(defaultOrderFormTemplate)}
              onCreateOrder={handleCreateOrder}
            />
          )}
          {activeView === "calendar" && (
            <CalendarView
              orderList={visibleOrders.length ? visibleOrders : orderList}
              appraisers={appraiserList}
              preferences={calendarPreferenceList}
              onTogglePreference={handleToggleCalendarPreference}
            />
          )}
          {(activeView === "review" || activeView === "review-queue") && (
            <ReviewView
              orderList={visibleOrders.length ? visibleOrders : orderList}
              user={activeUser}
              onReviewAction={handleReviewAction}
              onCompleteReviewItem={handleCompleteReviewItem}
              onReviewerComment={handleReviewerComment}
            />
          )}
          {activeView === "completed-reviews" && <CompletedReviewsView orderList={orderList} />}
          {activeView === "templates" && <ReviewTemplatesView />}
          {activeView === "appraisers" && <AppraiserPortalView orderList={visibleOrders.length ? visibleOrders : orderList} appraiserList={appraiserList} />}
          {activeView === "clients" && (
            <ClientsView
              user={activeUser}
              clientList={clientList}
              orderList={orderList}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
            />
          )}
          {activeView === "vendors" && <VendorView vendors={vendorList} vendorDocuments={vendorDocumentList} user={activeUser} onInviteVendor={handleInviteVendor} />}
          {activeView === "vendor-invites" && <VendorInvitesView vendors={vendorList} onInviteVendor={handleInviteVendor} />}
          {activeView === "compliance" && <ComplianceView vendors={vendorList} vendorDocuments={vendorDocumentList} onDocumentStatusChange={handleVendorDocumentStatus} />}
          {(activeView === "accounting" || activeView === "pay") && (
            <AccountingView
              user={activeUser}
              entries={accountingList}
              invoices={invoiceList}
              invoiceSettings={invoiceSettingsList}
              appraisers={appraiserList}
              onMarkInvoiceSent={(invoiceId) => setInvoiceList((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: "Sent" } : invoice))}
              onMarkInvoicePaid={handleMarkInvoicePaid}
              onUpdateDefaultSplit={handleUpdateDefaultSplit}
              onOverrideCommission={handleOverrideCommission}
              onFixedPayoutOverride={handleFixedPayoutOverride}
              onMarkPaid={handleMarkPayrollPaid}
              onExportCsv={handleExportPayrollCsv}
            />
          )}
          {activeView === "analytics" && <AnalyticsView entries={accountingList} orderList={orderList} />}
          {activeView === "documents" && (
            <DocumentsView
              orderList={visibleOrders}
              user={activeUser}
              documents={managedDocumentList}
              requiredRules={requiredDocumentRuleList}
              vendorDocuments={vendorDocumentList}
              reportSubmissions={reportSubmissionList}
              deliveryRecords={deliveryRecordList}
              auditEvents={documentAuditEventList}
            />
          )}
          {activeView === "messages" && (
            <MessagesView
              orderList={visibleOrders}
              user={activeUser}
              messages={orderMessageList}
              onSendMessage={handleSendOrderMessage}
              onToggleMessagePinned={handleToggleMessagePinned}
              onToggleMessageRead={handleToggleMessageRead}
            />
          )}
          {activeView === "reports" && (
            <ReportsView
              orderList={visibleOrders}
              documents={managedDocumentList}
              reportSubmissions={reportSubmissionList}
              deliveryRecords={deliveryRecordList}
            />
          )}
          {activeView === "revisions" && <RevisionsView orderList={visibleOrders} onSelectOrder={(order) => { setSelectedOrderId(order.id); openView(canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders", "review-queue"); }} />}
          {activeView === "notifications" && <NotificationsView />}
          {activeView === "settings" && (
            <SettingsView
              user={activeUser}
              organization={activeOrganization}
              companyUsers={companyUserList}
              invitations={invitationList}
              publicOrderSettings={publicOrderSettingsList}
              publicOrderRequests={publicOrderRequestList}
              notificationPreferences={notificationPreferenceList}
              notificationTemplates={notificationTemplateList}
              emailDeliveryRecords={emailDeliveryList}
              invoiceSettings={invoiceSettingsList}
              integrations={integrationList}
              integrationLogs={integrationLogList}
              onInviteUser={handleInviteCompanyUser}
              onUpdateInvitationStatus={handleUpdateInvitationStatus}
              onChangeRole={handleChangeCompanyUserRole}
              onTogglePermission={handleToggleCompanyUserPermission}
              onDeactivateUser={handleDeactivateCompanyUser}
              onTogglePublicOrdering={handleTogglePublicOrdering}
              onUpdatePublicConfirmation={handleUpdatePublicConfirmation}
              onToggleNotificationPreference={handleToggleNotificationPreference}
              onConvertPublicRequest={handleConvertPublicRequest}
            />
          )}
        </main>
      </div>
      {commandOpen && (
        <CommandPalette
          query={globalQuery}
          setQuery={setGlobalQuery}
          onClose={() => setCommandOpen(false)}
          onNavigate={(view) => {
            setActiveView(view);
            setCommandOpen(false);
          }}
          onSelectOrder={(order) => {
            setSelectedOrderId(order.id);
            openView(canViewOwnOrdersOnly(activeUser) ? "my-orders" : "orders", "review-queue");
            setCommandOpen(false);
          }}
          orderList={visibleOrders}
          navItems={activeNavItems}
        />
      )}
    </div>
  );
}
