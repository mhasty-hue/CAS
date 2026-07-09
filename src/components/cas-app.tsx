"use client";

import { useEffect, useState } from "react";
import { appraisers, calendarPreferences, clientProfiles, companyUsers, defaultOrderFormTemplate, orders, vendors } from "@/data/demo";
import { accountingEntries, invoices, organizations, portalUsers, vendorDocuments } from "@/data/platform";
import type { AccountingEntry, AppraiserProfile, CalendarPreference, ClientProfile, CompanyUser, Invoice, Note, Order, OrderFormTemplate, OrderStatus, Organization, PermissionKey, PortalUser, UserRole, VendorDocument, VendorProfile } from "@/types/domain";
import { canCreateOrders, canViewAllOrders, canViewOwnOrdersOnly } from "@/lib/permissions";
import { AccountingView, AnalyticsView } from "./cas/accounting";
import { CalendarView } from "./cas/calendar";
import { ClientsView } from "./cas/clients";
import { navCatalog, roleNavigation, type NavId } from "./cas/config";
import { AppraiserPortalView, DashboardView } from "./cas/dashboard";
import { NewOrderView } from "./cas/forms";
import { CommandPalette, Sidebar, Topbar } from "./cas/layout";
import { OrdersView } from "./cas/orders";
import { CompletedReviewsView, ReviewTemplatesView, ReviewView, RevisionsView } from "./cas/review";
import { DocumentsView, MessagesView, NotificationsView, ReportsView } from "./cas/support";
import { SettingsView } from "./cas/users";
import { ComplianceView, VendorInvitesView, VendorView } from "./cas/vendors";

function applyAccountingSplit(entry: AccountingEntry, split: number): AccountingEntry {
  const payout = Math.round(Math.max(0, entry.fee - entry.techFee) * (split / 100));
  return {
    ...entry,
    commissionSplit: split,
    appraiserSplit: payout,
    companyRevenue: Math.max(0, entry.fee - entry.techFee - payout)
  };
}

function filterOrdersForUser(orderList: Order[], user: PortalUser, organization: Organization) {
  if (canViewAllOrders(user)) return orderList;
  if (user.appraiserName) return orderList.filter((order) => order.appraiser === user.appraiserName || order.appraiser === "Unassigned");
  if (user.clientName) return orderList.filter((order) => order.client === user.clientName);
  if (organization.type === "amc") return orderList.filter((order) => order.amc === organization.name || order.client === organization.name);
  return orderList.filter((order) => order.client === organization.name || order.appraiser === user.name);
}

export function CasApp() {
  const [activeView, setActiveView] = useState<NavId>("dashboard");
  const [orderList, setOrderList] = useState<Order[]>(orders);
  const [appraiserList, setAppraiserList] = useState<AppraiserProfile[]>(appraisers);
  const [clientList, setClientList] = useState<ClientProfile[]>(clientProfiles);
  const [companyUserList, setCompanyUserList] = useState<CompanyUser[]>(companyUsers);
  const [vendorList, setVendorList] = useState<VendorProfile[]>(vendors);
  const [vendorDocumentList, setVendorDocumentList] = useState<VendorDocument[]>(vendorDocuments);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>(invoices);
  const [accountingList, setAccountingList] = useState<AccountingEntry[]>(accountingEntries);
  const [orderFormTemplate, setOrderFormTemplate] = useState<OrderFormTemplate>(defaultOrderFormTemplate);
  const [calendarPreferenceList, setCalendarPreferenceList] = useState<CalendarPreference[]>(calendarPreferences);
  const [activeUserId, setActiveUserId] = useState(portalUsers[0].id);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0].id);
  const [commandOpen, setCommandOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const activeUser = portalUsers.find((user) => user.id === activeUserId) ?? portalUsers[0];
  const activeOrganization = organizations.find((organization) => organization.id === activeUser.organizationId) ?? organizations[0];
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

  function handleUpdateDefaultSplit(appraiserName: string, split: number) {
    setAppraiserList((current) =>
      current.map((appraiser) =>
        appraiser.name === appraiserName ? { ...appraiser, defaultCommissionSplit: split } : appraiser
      )
    );
    setAccountingList((current) =>
      current.map((entry) => (entry.appraiser === appraiserName ? applyAccountingSplit(entry, split) : entry))
    );
  }

  function handleOverrideCommission(orderId: string, split: number) {
    setAccountingList((current) =>
      current.map((entry) => (entry.orderId === orderId ? applyAccountingSplit(entry, split) : entry))
    );
    updateOrder(orderId, (order) => {
      const payout = Math.round(Math.max(0, order.fee - order.techFee) * (split / 100));
      return {
        ...order,
        commissionSplitOverride: split,
        appraiserPayout: payout,
        lastUpdate: `Commission override set to ${split}%`
      };
    });
  }

  function handleMarkPayrollPaid(entryIds: string[]) {
    const ids = new Set(entryIds);
    setAccountingList((current) =>
      current.map((entry) =>
        ids.has(entry.id)
          ? { ...entry, status: "Paid", paidAt: "2026-07-08" }
          : entry
      )
    );
  }

  function handleExportPayrollCsv(entriesToExport: AccountingEntry[]) {
    const rows = [
      ["Order", "Completed", "Client", "Appraiser", "Product", "County", "Gross fee", "Tech fee", "Split", "Payout", "Status"],
      ...entriesToExport.map((entry) => [
        entry.orderId,
        entry.completedAt,
        entry.client,
        entry.appraiser,
        entry.productType,
        entry.county,
        String(entry.fee),
        String(entry.techFee),
        `${entry.commissionSplit}%`,
        String(entry.appraiserSplit),
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
          {(activeView === "orders" || activeView === "my-orders") && (
            <OrdersView
              orderList={visibleOrders}
              selectedOrder={selectedOrder}
              user={activeUser}
              onSelectOrder={(order) => setSelectedOrderId(order.id)}
              onAssignOrder={handleAssignOrder}
              onStatusChange={handleStatusChange}
              onAddNote={handleAddNote}
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
          {(activeView === "review" || activeView === "review-queue") && <ReviewView orderList={visibleOrders.length ? visibleOrders : orderList} user={activeUser} onReviewAction={handleReviewAction} onSelectOrder={(order) => { setSelectedOrderId(order.id); setActiveView("orders"); }} />}
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
              appraisers={appraiserList}
              onMarkInvoiceSent={(invoiceId) => setInvoiceList((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: "Sent" } : invoice))}
              onUpdateDefaultSplit={handleUpdateDefaultSplit}
              onOverrideCommission={handleOverrideCommission}
              onMarkPaid={handleMarkPayrollPaid}
              onExportCsv={handleExportPayrollCsv}
            />
          )}
          {activeView === "analytics" && <AnalyticsView entries={accountingList} orderList={orderList} />}
          {activeView === "documents" && <DocumentsView orderList={visibleOrders} />}
          {activeView === "messages" && <MessagesView orderList={visibleOrders} user={activeUser} onAddNote={handleAddNote} />}
          {activeView === "reports" && <ReportsView orderList={visibleOrders} />}
          {activeView === "revisions" && <RevisionsView orderList={visibleOrders} onSelectOrder={(order) => { setSelectedOrderId(order.id); setActiveView("my-orders"); }} />}
          {activeView === "notifications" && <NotificationsView />}
          {activeView === "settings" && (
            <SettingsView
              user={activeUser}
              companyUsers={companyUserList}
              onInviteUser={handleInviteCompanyUser}
              onChangeRole={handleChangeCompanyUserRole}
              onTogglePermission={handleToggleCompanyUserPermission}
              onDeactivateUser={handleDeactivateCompanyUser}
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
            setActiveView("orders");
            setCommandOpen(false);
          }}
          orderList={visibleOrders}
          navItems={activeNavItems}
        />
      )}
    </div>
  );
}
