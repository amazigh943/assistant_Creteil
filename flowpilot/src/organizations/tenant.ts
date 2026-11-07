import type { Id, TenantOwned, WorkspaceData } from "@/core/domain/types";

/**
 * Portée d'organisation (tenant).
 *
 * ⚠️ PROTOTYPE — CE N'EST PAS UN MÉCANISME DE SÉCURITÉ.
 * Ces fonctions servent uniquement à garder un code « conscient du tenant »
 * et à détecter des incohérences pendant le développement. Tout s'exécute
 * dans le navigateur : un utilisateur peut lire et modifier ces données.
 *
 * En production, l'isolation devra être garantie côté serveur :
 * authentification, organisation dérivée de la session (jamais du client),
 * filtrage systématique en base (ex. Row Level Security) et tests dédiés.
 */
export interface TenantScope {
  organizationId: Id;
}

export function belongsTo(entity: TenantOwned, scope: TenantScope): boolean {
  return entity.organizationId === scope.organizationId;
}

/** Vérifie qu'aucune entité d'une autre organisation n'est présente (aide au développement). */
export function findForeignEntities(data: WorkspaceData): string[] {
  const scope = { organizationId: data.organization.id };
  const collections = {
    teams: data.teams,
    agents: data.agents,
    companies: data.companies,
    sites: data.sites,
    requesters: data.requesters,
    tickets: data.tickets,
    events: data.events,
    reminders: data.reminders,
    schedule: data.schedule,
  } satisfies Record<string, TenantOwned[]>;
  return Object.entries(collections).flatMap(([name, items]) =>
    items.filter((i) => !belongsTo(i, scope)).map(() => name),
  );
}
