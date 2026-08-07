import { useEffect, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Bell, Building2, CheckCircle2, Globe2, Link2, Plus, ReceiptText, RotateCcw, Settings, ShieldCheck, UserCheck } from "lucide-react";
import { permissionCatalog } from "@/data/demo";
import type { ClientTrackingStage, CompanyUser, EmailDeliveryRecord, IntegrationLog, IntegrationSetting, InvoiceSettings, NotificationPreference, NotificationTemplate, Order, OrderStatus, Organization, OrganizationInvitation, OrganizationNotificationSettings, OrganizationOrderStatus, PermissionKey, PortalUser, PublicOrderRequest, PublicOrderSettings, UserRole } from "@/types/domain";
import { canInviteUsers, canManageCompanyUsers, canManageIntegrations, canManageNotificationSettings, canManagePublicOrdering } from "@/lib/permissions";
import { orderStatusOptions } from "@/lib/orders/workflow";
import { canArchiveStatus, canDeleteStatus, clientTrackingStages, statusUsageCount } from "@/lib/orders/status-config";
import { cn } from "@/lib/utils";
import { roleLabel, roleNavigation } from "./config";
import { SectionHeader } from "./shared";

export function SettingsView({
  user,
  organization,
  companyUsers,
  orderList,
  orderStatuses,
  invitations,
  publicOrderSettings,
  publicOrderRequests,
  notificationPreferences,
  notificationTemplates,
  emailDeliveryRecords,
  notificationSettings,
  invoiceSettings,
  integrations,
  integrationLogs,
  onInviteUser,
  onUpdateInvitationStatus,
  onChangeRole,
  onTogglePermission,
  onDeactivateUser,
  onTogglePublicOrdering,
  onUpdatePublicConfirmation,
  onToggleNotificationPreference,
  onConvertPublicRequest,
  onAddOrderStatus,
  onUpdateOrderStatus,
  onArchiveOrderStatus,
  onRestoreOrderStatus,
  onMoveOrderStatus
}: {
  user: PortalUser;
  organization: Organization;
  companyUsers: CompanyUser[];
  orderList: Order[];
  orderStatuses: OrganizationOrderStatus[];
  invitations: OrganizationInvitation[];
  publicOrderSettings: PublicOrderSettings[];
  publicOrderRequests: PublicOrderRequest[];
  notificationPreferences: NotificationPreference[];
  notificationTemplates: NotificationTemplate[];
  emailDeliveryRecords: EmailDeliveryRecord[];
  notificationSettings?: OrganizationNotificationSettings;
  invoiceSettings: InvoiceSettings[];
  integrations: IntegrationSetting[];
  integrationLogs: IntegrationLog[];
  onInviteUser: () => void;
  onUpdateInvitationStatus: (invitationId: string, status: OrganizationInvitation["status"]) => void;
  onChangeRole: (userId: string, role: UserRole) => void;
  onTogglePermission: (userId: string, permission: PermissionKey) => void;
  onDeactivateUser: (userId: string) => void;
  onTogglePublicOrdering: (organizationId: string) => void;
  onUpdatePublicConfirmation: (organizationId: string, confirmationMessage: string) => void;
  onToggleNotificationPreference: (preferenceId: string, channel: "emailEnabled" | "inAppEnabled") => void;
  onConvertPublicRequest: (requestId: string) => void;
  onAddOrderStatus: () => void;
  onUpdateOrderStatus: (statusId: string, patch: Partial<OrganizationOrderStatus>) => void;
  onArchiveOrderStatus: (statusId: string) => void;
  onRestoreOrderStatus: (statusId: string) => void;
  onMoveOrderStatus: (statusId: string, direction: -1 | 1) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState(companyUsers[0]?.id ?? "");
  const selectedUser = companyUsers.find((companyUser) => companyUser.id === selectedUserId) ?? companyUsers[0];
  const canInvite = canInviteUsers(user);
  const canManage = canManageCompanyUsers(user);
  const activePublicSettings = publicOrderSettings.find((settings) => settings.organizationId === organization.id) ?? publicOrderSettings[0];
  const scopedPublicRequests = publicOrderRequests.filter((request) => request.organizationId === organization.id);
  const activeInvoiceSettings = invoiceSettings.find((settings) => settings.organizationId === organization.id) ?? invoiceSettings[0];

  useEffect(() => {
    if (!companyUsers.some((companyUser) => companyUser.id === selectedUserId)) {
      setSelectedUserId(companyUsers[0]?.id ?? "");
    }
  }, [companyUsers, selectedUserId]);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-5">
        <ProfileAndOrganizationPanel user={user} organization={organization} />
        {canManage && (
          <OrderStatusSettingsPanel
            organization={organization}
            statuses={orderStatuses}
            orders={orderList}
            canManage={canManage}
            onAddStatus={onAddOrderStatus}
            onUpdateStatus={onUpdateOrderStatus}
            onArchiveStatus={onArchiveOrderStatus}
            onRestoreStatus={onRestoreOrderStatus}
            onMoveStatus={onMoveOrderStatus}
          />
        )}
        <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader icon={Settings} title="Company Users and Permissions" />
          <button className="primary-button disabled:opacity-50" disabled={!canInvite} onClick={onInviteUser}><UserCheck className="h-4 w-4" /> Invite user</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Permissions</th>
                <th className="px-5 py-3">Last active</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {companyUsers.map((companyUser) => (
                <tr key={companyUser.id} className={cn("hover:bg-slate-50", selectedUser?.id === companyUser.id && "bg-brand-50/60")} onClick={() => setSelectedUserId(companyUser.id)}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{companyUser.name}</div>
                    <div className="text-xs text-slate-500">{companyUser.email}</div>
                  </td>
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <select className="control h-9" value={companyUser.role} disabled={!canManage} onChange={(event) => onChangeRole(companyUser.id, event.target.value as UserRole)}>
                      {Object.keys(roleNavigation).map((role) => <option key={role} value={role}>{roleLabel(role as UserRole)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4"><span className={cn("chip", companyUser.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : companyUser.status === "Pending invite" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600")}>{companyUser.status}</span></td>
                  <td className="px-5 py-4 text-slate-600">{companyUser.permissions.length}</td>
                  <td className="px-5 py-4 text-slate-600">{companyUser.lastActive}</td>
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage} onClick={() => onDeactivateUser(companyUser.id)}>
                      {companyUser.status === "Inactive" ? "Reactivate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        <InvitationPanel invitations={invitations} canManage={canManage} onUpdateInvitationStatus={onUpdateInvitationStatus} />
        <PublicRequestsPanel requests={scopedPublicRequests} onConvertPublicRequest={onConvertPublicRequest} />
      </div>
      <aside className="grid content-start gap-5">
        <div className="panel p-5">
        <SectionHeader icon={ShieldCheck} title="Permission Toggles" />
        {selectedUser ? (
          <>
            <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
              <div className="font-semibold text-slate-900">{selectedUser.name}</div>
              <div className="mt-1 text-slate-500">{roleLabel(selectedUser.role)} - {selectedUser.status}</div>
            </div>
            <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {permissionCatalog.map((permission) => (
                <label key={permission.key} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
                  <span>
                    <span className="block font-medium text-slate-800">{permission.label}</span>
                    <span className="text-xs text-slate-500">{permission.group}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line text-brand-600"
                    checked={selectedUser.permissions.includes(permission.key)}
                    disabled={!canManage}
                    onChange={() => onTogglePermission(selectedUser.id, permission.key)}
                  />
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-slate-500">Select a user to manage permissions.</div>
        )}
        </div>
        <PublicOrderingPanel
          settings={activePublicSettings}
          canManage={canManagePublicOrdering(user)}
          onTogglePublicOrdering={onTogglePublicOrdering}
          onUpdatePublicConfirmation={onUpdatePublicConfirmation}
        />
        <NotificationSettingsPanel
          preferences={notificationPreferences}
          templates={notificationTemplates}
          deliveries={emailDeliveryRecords}
          settings={notificationSettings}
          canManage={canManageNotificationSettings(user)}
          onToggleNotificationPreference={onToggleNotificationPreference}
        />
        <InvoiceSettingsPanel settings={activeInvoiceSettings} />
        <IntegrationSettingsPanel integrations={integrations} logs={integrationLogs} canManage={canManageIntegrations(user)} />
      </aside>
    </section>
  );
}



function ProfileAndOrganizationPanel({ user, organization }: { user: PortalUser; organization: Organization }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="panel p-5">
        <SectionHeader icon={UserCheck} title="User Profile" />
        <div className="mt-4 rounded-md border border-line bg-slate-50 p-4 text-sm">
          <div className="font-semibold text-slate-900">{user.name}</div>
          <div className="mt-1 text-slate-600">{user.email}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip border-brand-200 bg-brand-50 text-brand-700">{roleLabel(user.role)}</span>
            <span className="chip border-slate-200 bg-white text-slate-600">{user.title}</span>
          </div>
        </div>
      </div>
      <div className="panel p-5">
        <SectionHeader icon={Building2} title="Company Profile" />
        <div className="mt-4 rounded-md border border-line bg-slate-50 p-4 text-sm">
          <div className="font-semibold text-slate-900">{organization.name}</div>
          <div className="mt-1 text-slate-600">{organization.address}</div>
          <div className="mt-3 grid gap-1 text-xs text-slate-500">
            <span>{organization.email}</span>
            <span>{organization.phone}</span>
            <span>Public slug: {organization.slug ?? "not set"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}



function OrderStatusSettingsPanel({
  organization,
  statuses,
  orders,
  canManage,
  onAddStatus,
  onUpdateStatus,
  onArchiveStatus,
  onRestoreStatus,
  onMoveStatus
}: {
  organization: Organization;
  statuses: OrganizationOrderStatus[];
  orders: Order[];
  canManage: boolean;
  onAddStatus: () => void;
  onUpdateStatus: (statusId: string, patch: Partial<OrganizationOrderStatus>) => void;
  onArchiveStatus: (statusId: string) => void;
  onRestoreStatus: (statusId: string) => void;
  onMoveStatus: (statusId: string, direction: -1 | 1) => void;
}) {
  const scopedStatuses = statuses
    .filter((status) => status.organizationId === organization.id)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <SectionHeader icon={Settings} title="Orders / Statuses" />
          <p className="mt-1 text-sm text-slate-500">Customize organization-facing labels while CAS keeps canonical workflow automation, queues, and client tracking stable.</p>
        </div>
        <button className="primary-button disabled:opacity-50" disabled={!canManage} onClick={onAddStatus}><Plus className="h-4 w-4" /> Add status</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Status name</th>
              <th className="px-4 py-3">Canonical workflow stage</th>
              <th className="px-4 py-3">Client-facing label</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Archive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {scopedStatuses.map((status) => {
              const usage = statusUsageCount(status, orders);
              const deleteBlocked = !canDeleteStatus(status, orders);
              return (
                <tr key={status.id} className={cn(status.archivedAt && "bg-slate-50 text-slate-500")}>
                  <td className="px-4 py-3 align-top">
                    <input
                      className="control h-9 w-full"
                      value={status.name}
                      disabled={!canManage}
                      onChange={(event) => onUpdateStatus(status.id, { name: event.target.value })}
                    />
                    <textarea
                      className="control mt-2 min-h-16 w-full py-2 text-xs"
                      value={status.description ?? ""}
                      disabled={!canManage}
                      onChange={(event) => onUpdateStatus(status.id, { description: event.target.value })}
                      placeholder="Optional internal description"
                    />
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {status.systemRequired && <span className="chip border-slate-200 bg-slate-50 text-slate-600">System required</span>}
                      {status.archivedAt && <span className="chip border-amber-200 bg-amber-50 text-amber-800">Archived</span>}
                      {deleteBlocked && !status.systemRequired && <span className="chip border-blue-200 bg-blue-50 text-blue-700">Historical orders preserved</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      className="control h-9"
                      value={status.canonicalStatus}
                      disabled={!canManage}
                      onChange={(event) => onUpdateStatus(status.id, { canonicalStatus: event.target.value as OrderStatus })}
                    >
                      {orderStatusOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      className="control h-9"
                      value={status.clientFacingStage}
                      disabled={!canManage}
                      onChange={(event) => onUpdateStatus(status.id, { clientFacingStage: event.target.value as ClientTrackingStage })}
                    >
                      {clientTrackingStages.map((stage) => <option key={stage}>{stage}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="grid gap-2 text-xs text-slate-600">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={status.active} disabled={!canManage || status.systemRequired} onChange={() => onUpdateStatus(status.id, { active: !status.active })} /> Active</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={status.appearsInDropdown} disabled={!canManage || Boolean(status.archivedAt)} onChange={() => onUpdateStatus(status.id, { appearsInDropdown: !status.appearsInDropdown })} /> Dropdown</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={status.appearsAsFilter} disabled={!canManage || Boolean(status.archivedAt)} onChange={() => onUpdateStatus(status.id, { appearsAsFilter: !status.appearsAsFilter })} /> Orders filter</label>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-900">{usage}</div>
                    <div className="mt-1 text-xs text-slate-500">{usage > 0 ? "Archive preserves old orders and audit text." : "Unused in current demo orders."}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-1">
                      <button className="icon-button disabled:opacity-40" disabled={!canManage} aria-label={`Move ${status.name} up`} onClick={() => onMoveStatus(status.id, -1)}><ArrowUp className="h-4 w-4" /></button>
                      <button className="icon-button disabled:opacity-40" disabled={!canManage} aria-label={`Move ${status.name} down`} onClick={() => onMoveStatus(status.id, 1)}><ArrowDown className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Display {status.displayOrder}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {status.archivedAt ? (
                      <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage} onClick={() => onRestoreStatus(status.id)}><RotateCcw className="h-4 w-4" /> Restore</button>
                    ) : (
                      <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage || !canArchiveStatus(status, orders)} onClick={() => onArchiveStatus(status.id)}><Archive className="h-4 w-4" /> Archive</button>
                    )}
                    <div className="mt-2 text-xs text-slate-500">Permanent delete is unavailable for workflow safety.</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function InvitationPanel({ invitations, canManage, onUpdateInvitationStatus }: { invitations: OrganizationInvitation[]; canManage: boolean; onUpdateInvitationStatus: (invitationId: string, status: OrganizationInvitation["status"]) => void }) {
  return (
    <div className="panel p-5">
      <SectionHeader icon={UserCheck} title="Invite-Based Onboarding" />
      <div className="mt-4 grid gap-3">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="rounded-md border border-line p-3 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold text-slate-900">{invitation.invitedName}</div>
                <div className="text-xs text-slate-500">{invitation.email} - {roleLabel(invitation.role)}</div>
              </div>
              <span className={cn("chip", invitation.status === "Pending" ? "border-amber-200 bg-amber-50 text-amber-800" : invitation.status === "Accepted" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{invitation.status}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">Expires {invitation.expiresAt} - {invitation.permissions.length} permissions - /invite/{invitation.token}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage} onClick={() => onUpdateInvitationStatus(invitation.id, "Accepted")}>Accept demo</button>
              <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage} onClick={() => onUpdateInvitationStatus(invitation.id, "Revoked")}>Revoke</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



function PublicRequestsPanel({ requests, onConvertPublicRequest }: { requests: PublicOrderRequest[]; onConvertPublicRequest: (requestId: string) => void }) {
  return (
    <div className="panel p-5">
      <SectionHeader icon={Globe2} title="Public Order Requests" />
      <div className="mt-4 grid gap-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-md border border-line p-3 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold text-slate-900">{request.requesterName} - {request.purpose}</div>
                <div className="text-xs text-slate-500">{request.propertyAddress}</div>
              </div>
              <span className={cn("chip", request.status === "Pending review" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{request.status}</span>
            </div>
            <div className="mt-2 text-slate-600">{request.comments}</div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">{request.documentCount} documents - {request.preferredContactMethod}</span>
              <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={request.status !== "Pending review"} onClick={() => onConvertPublicRequest(request.id)}>
                <CheckCircle2 className="h-4 w-4" />
                Convert
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



function PublicOrderingPanel({
  settings,
  canManage,
  onTogglePublicOrdering,
  onUpdatePublicConfirmation
}: {
  settings?: PublicOrderSettings;
  canManage: boolean;
  onTogglePublicOrdering: (organizationId: string) => void;
  onUpdatePublicConfirmation: (organizationId: string, confirmationMessage: string) => void;
}) {
  if (!settings) return null;
  const publicUrl = `/order/${settings.publicSlug}`;

  return (
    <div className="panel p-5">
      <SectionHeader icon={Globe2} title="Public Order Settings" />
      <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-slate-900">{settings.brandName}</span>
          <span className={cn("chip", settings.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}>{settings.enabled ? "Enabled" : "Disabled"}</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">{publicUrl}</div>
      </div>
      <button className="secondary-button mt-3 w-full justify-center disabled:opacity-50" disabled={!canManage} onClick={() => onTogglePublicOrdering(settings.organizationId)}>
        {settings.enabled ? "Disable public ordering" : "Enable public ordering"}
      </button>
      <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700">
        <span>Confirmation message</span>
        <textarea className="control min-h-24 w-full py-3" disabled={!canManage} value={settings.confirmationMessage} onChange={(event) => onUpdatePublicConfirmation(settings.organizationId, event.target.value)} />
      </label>
      <div className="mt-4 grid gap-2 text-xs text-slate-500">
        <span>{settings.notificationRecipients.length} notification recipients</span>
        <span>{settings.requiredFields.length} required fields</span>
        <span>{settings.customQuestions.length} custom questions</span>
      </div>
    </div>
  );
}



function NotificationSettingsPanel({
  preferences,
  templates,
  deliveries,
  settings,
  canManage,
  onToggleNotificationPreference
}: {
  preferences: NotificationPreference[];
  templates: NotificationTemplate[];
  deliveries: EmailDeliveryRecord[];
  settings?: OrganizationNotificationSettings;
  canManage: boolean;
  onToggleNotificationPreference: (preferenceId: string, channel: "emailEnabled" | "inAppEnabled") => void;
}) {
  const failedDeliveries = deliveries.filter((delivery) => delivery.status === "Failed" || delivery.status === "Configuration required").length;
  return (
    <div className="panel p-5">
      <SectionHeader icon={Bell} title="Notification Foundation" />
      <div className="mt-4 grid gap-2 text-sm">
        <div className="rounded-md border border-line bg-slate-50 p-3">
          <div className="font-semibold text-slate-900">{settings?.emailEnabled ? "Email delivery enabled" : "Email provider configuration required"}</div>
          <div className="mt-1 text-xs text-slate-500">
            {settings?.emailEnabled ? "CAS will queue provider-backed email after preferences and privacy rules pass." : "CAS creates in-app notifications and records email as unavailable until a provider is configured."}
          </div>
        </div>
        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <div className="rounded-md border border-line p-3">Due warnings: {(settings?.defaultDueWarningHours ?? [72, 48, 24, 0]).join(", ")} hours</div>
          <div className="rounded-md border border-line p-3">Bid reminders: {(settings?.bidReminderHours ?? [24, 4]).join(", ")} hours</div>
          <div className="rounded-md border border-line p-3">Assignment response target: {settings?.assignmentAcceptanceHours ?? 12} hours</div>
          <div className="rounded-md border border-line p-3">Escalation role: {settings?.escalationRecipientRole ?? "company_admin"}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {preferences.map((preference) => {
          const template = templates.find((item) => item.eventKey === preference.eventKey);
          return (
            <div key={preference.id} className="rounded-md border border-line p-3 text-sm">
              <div className="font-semibold text-slate-900">{template?.label ?? preference.eventKey}</div>
              <div className="mt-1 text-xs text-slate-500">{template?.preview ?? "Event-specific preference"}</div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <label className="flex items-center gap-2"><input type="checkbox" checked={preference.emailEnabled} disabled={!canManage} onChange={() => onToggleNotificationPreference(preference.id, "emailEnabled")} /> Email</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={preference.inAppEnabled} disabled={!canManage} onChange={() => onToggleNotificationPreference(preference.id, "inAppEnabled")} /> In-app</label>
                <span>{preference.cadence}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-md border border-dashed border-line p-3 text-xs text-slate-500">
        {deliveries.length} email delivery records. {failedDeliveries} need provider or retry attention. Demo mode records simulated email only.
      </div>
    </div>
  );
}



function InvoiceSettingsPanel({ settings }: { settings?: InvoiceSettings }) {
  if (!settings) return null;

  return (
    <div className="panel p-5">
      <SectionHeader icon={ReceiptText} title="Invoice Settings" />
      <div className="mt-4 grid gap-2 text-sm">
        <div className="rounded-md border border-line bg-slate-50 p-3">
          <div className="font-semibold text-slate-900">{settings.companyName}</div>
          <div className="mt-1 text-xs text-slate-500">{settings.companyAddress}</div>
        </div>
        <div className="rounded-md border border-line p-3">
          <div className="text-xs text-slate-500">Next invoice</div>
          <div className="mt-1 font-semibold text-slate-900">{settings.invoicePrefix}-{settings.nextInvoiceNumber}</div>
        </div>
        <div className="rounded-md border border-line p-3 text-xs text-slate-600">{settings.defaultPaymentTerms} - {settings.paymentInstructions}</div>
        <div className="rounded-md border border-line p-3 text-xs text-slate-600">{settings.defaultInvoiceNotes}</div>
      </div>
    </div>
  );
}



function IntegrationSettingsPanel({ integrations, logs, canManage }: { integrations: IntegrationSetting[]; logs: IntegrationLog[]; canManage: boolean }) {
  return (
    <div className="panel p-5">
      <SectionHeader icon={Link2} title="LOS Integrations" />
      <div className="mt-4 space-y-3">
        {integrations.map((integration) => (
          <div key={integration.id} className="rounded-md border border-line p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-slate-900">{integration.providerLabel}</div>
              <span className={cn("chip", integration.status === "Connected" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{integration.status}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">{integration.credentialReference} - {integration.syncStatus}</div>
            <div className="mt-3 grid gap-2 text-xs text-slate-600">
              <span>{integration.fieldMappings.length} field mappings</span>
              <span>{integration.statusMappings.length} status mappings</span>
              <span>{integration.documentMappings.length} document mappings</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage}>Test connection</button>
              <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage}>Import loan</button>
              <button className="secondary-button h-8 px-2 text-xs disabled:opacity-50" disabled={!canManage}>Push status</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-dashed border-line p-3 text-xs text-slate-500">
        Latest log: {logs[0]?.detail ?? "No integration activity yet."}
      </div>
    </div>
  );
}
