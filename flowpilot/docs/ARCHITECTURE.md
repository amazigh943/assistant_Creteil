# FlowPilot — Architecture du prototype

> Statut : **prototype fonctionnel de FlowPilot Cloud**. Toutes les données sont fictives,
> stockées dans le navigateur, et aucune IA réelle n'est connectée.

## Principe directeur

L'agent fait trois choses : **appeler**, **résoudre**, **passer au suivant**.
Tout le reste (classification, attribution, compte rendu, relances, planning)
est préparé par le système et validé par l'agent.

## Deux produits, un moteur commun

```
            ┌────────────────────┐      ┌────────────────────────┐
            │  FlowPilot Cloud   │      │   FlowPilot Connect    │
            │ (UI + stockage     │      │ (moteur branché sur    │
            │  FlowPilot)        │      │  GLPI, etc.)           │
            └─────────┬──────────┘      └───────────┬────────────┘
                      │                             │
                      ▼                             ▼
            ┌─────────────────────────────────────────────────┐
            │          src/core — moteur métier commun        │
            │  domaine · règles tickets · planning ·          │
            │  automatisations · cas d'usage « intervention » │
            └─────────────────────────────────────────────────┘
                      ▲                             ▲
           services/ai (IA)              connectors/ (GLPI… plus tard)
```

`src/core` est du TypeScript pur : **aucune dépendance à React, Next.js ou au
navigateur**. Il pourra être extrait tel quel dans un package
(`packages/core`) le jour où FlowPilot Connect existera.

## Structure des dossiers

```
flowpilot/
├── docs/ARCHITECTURE.md
└── src/
    ├── app/                    # Interface — routes Next.js (App Router)
    │   └── (workspace)/        #   Aujourd'hui, Tickets, Ticket, Planning
    ├── components/
    │   ├── ui/                 #   Primitives shadcn/ui (Radix + Tailwind)
    │   ├── shell/              #   Barre latérale, en-têtes de page
    │   ├── tickets/            #   Icônes priorité/statut, listes
    │   ├── ticket/             #   Espace de travail d'un ticket
    │   ├── intervention/       #   Boutons d'issue, compositeur, compte rendu
    │   ├── assistant/          #   Panneau d'assistance (simulé)
    │   ├── dashboard/          #   Tableau de bord agent
    │   └── planning/           #   Planning d'équipe
    ├── core/                   # Logique métier (pure, testée)
    │   ├── domain/             #   Types : Ticket, Agent, Reminder, ScheduleItem…
    │   ├── tickets/            #   Libellés, urgence/SLA, requêtes, actions rapides
    │   ├── planning/           #   Heures ouvrées, recherche de créneau libre
    │   ├── automation/         #   Moteur d'automatisation : règles → plan → effets
    │   └── intervention/       #   Cas d'usage : enregistrer une intervention
    ├── services/ai/            # Services IA : interfaces + implémentation simulée
    ├── organizations/          # Contexte organisation (tenant) — voir limites
    ├── connectors/             # Contrat des connecteurs externes (non implémentés)
    ├── data/demo/              # Organisation fictive : 12 agents, clients, tickets
    ├── store/                  # État client (React) qui appelle le moteur
    └── lib/                    # Utilitaires (cn, formatage de dates)
```

## Flux d'une intervention

```
Agent ──► choisit une issue (Résolu / Aucune réponse / À poursuivre / Transférer)
      ──► actions rapides + note courte (+ dictée vocale plus tard)
      ──► services/ai.ReportComposer.compose()      → brouillon de compte rendu
      ──► l'agent corrige et valide
      ──► core/automation.planAutomations()          → plan visible AVANT validation
      ──► core/intervention.commitIntervention()     → événements + effets appliqués
      ──► « Ticket suivant »
```

Le moteur d'automatisation est en deux temps :

1. **Planifier** (`planAutomations`) : des règles déclaratives transforment
   l'intervention en une liste d'étapes lisibles, chacune portant des *effets*
   typés (`ticket.update`, `reminder.create`, `schedule.add`, `notification.prepare`…).
2. **Appliquer** (`applyAutomationPlan`) : les effets sont exécutés sur les données
   et journalisés dans l'historique du ticket.

Cette séparation permet d'afficher à l'agent ce qui va se passer, et plus tard
d'exécuter les mêmes effets via un connecteur (GLPI) au lieu du stockage local.

Scénarios couverts : résolution, absence de réponse (relance + rappel + créneau),
intervention à poursuivre (créneau planifié), transfert (attribution automatique
à l'agent le moins chargé de l'équipe cible), mise à jour du planning.

## Services IA

`services/ai/types.ts` définit les contrats (`AssistantProvider`, `ReportComposer`).
L'implémentation actuelle est `services/ai/simulated/` :

- suggestions de dépannage issues d'une **base de connaissances fictive** sélectionnée
  par mots-clés et catégorie ;
- compte rendu produit par un **modèle de texte déterministe** (mêmes entrées → même sortie).

L'interface affiche clairement « Simulation » : aucune IA n'est présentée comme active.
Brancher un vrai modèle consistera à fournir une autre implémentation de ces interfaces
(côté serveur, pour ne jamais exposer de clé d'API au navigateur).

## Organisations et isolation des données — limites assumées

Chaque entité porte un `organizationId`, et `organizations/` fournit un `TenantScope`.
**Ce n'est pas une sécurité multi-entreprise** : dans ce prototype, tout s'exécute dans
le navigateur avec une seule organisation de démonstration. L'isolation réelle devra être
appliquée côté serveur (authentification, contrôle d'accès à chaque requête, Row Level
Security ou base par client), jamais dans le client.

## Hors périmètre du prototype

Abonnements, SMS (Twilio), intégration GLPI, dictée vocale réelle, administration avancée,
authentification, persistance serveur.
