# FlowPilot Cloud — prototype

Espace de travail des agents de support informatique.
L'agent se concentre sur trois choses : **appeler, résoudre, passer au suivant**.
FlowPilot prépare le reste : priorisation, compte rendu, relances, transferts et planning.

> Prototype : données **fictives**, stockées dans le navigateur. Aucune IA n'est connectée :
> l'assistant et les comptes rendus sont **simulés de façon déterministe** et l'interface l'indique.

## Démarrer

```bash
cd flowpilot
npm install
npm run dev        # http://localhost:3000
```

Autres commandes : `npm test` (moteur métier), `npm run typecheck`, `npm run lint`, `npm run build`.

## Ce que permet le prototype

| Écran | Contenu |
| --- | --- |
| **Aujourd'hui** | Le ticket à traiter maintenant, la file triée par urgence, les tickets à prendre dans l'équipe, le planning du jour, les rappels et ce que FlowPilot a fait automatiquement. |
| **Ticket** | Demandeur (entreprise, établissement, téléphone, e-mail), appel chronométré, description, historique, propriétés et panneau d'assistance. |
| **Intervention** | Quatre issues — *Problème résolu*, *Aucune réponse*, *Intervention à poursuivre*, *Transférer le ticket* — avec actions rapides, note courte et (plus tard) dictée vocale. |
| **Compte rendu** | Brouillon structuré généré à partir des sélections, modifiable, puis validé. Les automatisations prévues sont affichées **avant** validation. |
| **Tickets** | Vues *Mes tickets*, *Équipe*, *Tous*, regroupées par statut, avec recherche. |
| **Planning** | Frise de la journée des 12 agents, avec les créneaux ajoutés par FlowPilot. |

Raccourcis dans un ticket : `C` appeler/raccrocher · `1`–`4` issue · `⌘/Ctrl + Entrée` valider · `J`/`K` ticket suivant/précédent · `N` après validation.

Le menu en bas de la barre latérale permet de **voir l'application en tant qu'un autre agent** et de **réinitialiser la démo**.

## Architecture

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). En bref :

- `src/core` — moteur métier pur (domaine, urgence/SLA, planning, moteur d'automatisation, cas d'usage), testé, partageable avec FlowPilot Connect ;
- `src/services/ai` — contrats IA + implémentation simulée ;
- `src/organizations` — portée d'organisation (**pas** une sécurité multi-entreprise) ;
- `src/connectors` — contrat des futurs connecteurs (GLPI…), non implémentés ;
- `src/data/demo` — organisation fictive : 12 agents, 4 équipes, 5 clients, 28 tickets ;
- `src/components`, `src/app` — interface (Next.js App Router, Tailwind CSS, shadcn/ui).

Les numéros de téléphone utilisent les plages réservées à la fiction par l'ARCEP et les adresses e-mail
le domaine réservé `.example`.
