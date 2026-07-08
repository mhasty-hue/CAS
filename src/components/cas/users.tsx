import { useEffect, useState } from "react";
import { Settings, ShieldCheck, UserCheck } from "lucide-react";
import { permissionCatalog } from "@/data/demo";
import type { CompanyUser, PermissionKey, PortalUser, UserRole } from "@/types/domain";
import { canInviteUsers, canManageCompanyUsers } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { roleLabel, roleNavigation } from "./config";
import { SectionHeader } from "./shared";

export function SettingsView({
  user,
  companyUsers,
  onInviteUser,
  onChangeRole,
  onTogglePermission,
  onDeactivateUser
}: {
  user: PortalUser;
  companyUsers: CompanyUser[];
  onInviteUser: () => void;
  onChangeRole: (userId: string, role: UserRole) => void;
  onTogglePermission: (userId: string, permission: PermissionKey) => void;
  onDeactivateUser: (userId: string) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState(companyUsers[0]?.id ?? "");
  const selectedUser = companyUsers.find((companyUser) => companyUser.id === selectedUserId) ?? companyUsers[0];
  const canInvite = canInviteUsers(user);
  const canManage = canManageCompanyUsers(user);

  useEffect(() => {
    if (!companyUsers.some((companyUser) => companyUser.id === selectedUserId)) {
      setSelectedUserId(companyUsers[0]?.id ?? "");
    }
  }, [companyUsers, selectedUserId]);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
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
      <aside className="panel p-5">
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
      </aside>
    </section>
  );
}


