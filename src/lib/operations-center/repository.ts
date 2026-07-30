import { assertOperationsCenterModel } from "@/lib/operations-center/contract";
import { buildOperationsCenterModel, commandCenterToday, type OperationsCenterDataSource, type OperationsCenterModel } from "@/lib/operations-center/service";
import type { CasRepository } from "@/lib/repositories";
import type { Organization, PortalUser } from "@/types/domain";

export type LoadOperationsCenterModelInput = {
  repository: CasRepository;
  user: PortalUser | null;
  organization: Organization | null;
  now?: Date;
  source?: OperationsCenterDataSource;
};

export async function loadOperationsCenterModelFromRepository({
  repository,
  user,
  organization,
  now = commandCenterToday,
  source = repository.mode
}: LoadOperationsCenterModelInput): Promise<OperationsCenterModel> {
  if (!user) {
    throw new Error("Operations Center requires an authenticated user.");
  }
  if (!organization) {
    throw new Error("Operations Center requires an active organization.");
  }

  const bootstrap = await repository.loadBootstrapData(organization.id);
  return assertOperationsCenterModel(buildOperationsCenterModel({
    orders: bootstrap.orders,
    appraisers: bootstrap.appraisers,
    user,
    organization,
    vendors: bootstrap.vendors,
    vendorDocuments: bootstrap.vendorDocuments,
    accountingEntries: bootstrap.accountingEntries,
    invoices: bootstrap.invoices,
    tasks: bootstrap.workflowTasks,
    now,
    source
  }));
}
