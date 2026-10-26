# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route composition in `App.tsx` and feature-specific rendering in the existing components. Use the shared API client with relative `/api` paths, and expose accessible loading, empty, and error states without moving business rules into React.
- Logic tier decision: Keep Express handlers thin and delegate validation, persistence, aggregation, and recommendation decisions to the service layer. Return contract-shaped responses and deliberate 4xx errors for invalid or unknown input; avoid leaking Mongoose cast errors as 500s.
- Data tier decision: Make required fields and defaults explicit in Mongoose schemas, including an empty default for team members and references for user/team links. Preserve the seed's idempotent upsert behavior and do not delete unrelated application data.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and positive `minutes`; validate ID format and that both records exist before writing. Store their IDs as `user` and `team`, calculate points server-side as one point per minute (matching seeded records), and set `occurredAt` on creation.
- Team management approach: Require a non-empty name and mascot, default members to an empty array, and preserve supplied team fields and member references in create/list responses. Reject a missing name with `400`.
- Leaderboard approach: Aggregate activity points by team, sort by total points descending, then assign 1-based ranks in the service response with `teamName` and `totalPoints`.
- Workout suggestions approach: Find the user by email; prefer a workout matching the user's goal or, when more relevant, their most recent activity pattern. Include a short reason tied to the goal/activity and return a deliberate 4xx when no user matches.

## Test plan

Baseline recorded before implementation. Run the targeted contract suite after each tier change; run both builds after the corresponding tier is implemented.

- Data tier: `npm run test:data --prefix octofit-tracker/backend` — baseline: 4 failed, 1 passed. The four failures stop at missing required-field validation for users, teams, activities, and workouts; the idempotent seed test passes.
- API: `npm run test:api --prefix octofit-tracker/backend` — baseline: 4 failed. Activity/team creation return `501`, leaderboard returns no scored teams, and workout suggestions do not select a user's matching workout. These failures identify service-layer behavior still to implement.
- Presentation: `npm test --prefix octofit-tracker/frontend` — baseline: 15 failed. Feature routes remain in the pending state, so data rendering, user-specific suggestion requests, and loading/empty/error states are missing.
- Backend build: `npm run build --prefix octofit-tracker/backend` — not run at baseline. Run after backend changes to catch TypeScript errors.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` — not run at baseline. Run after presentation changes to catch TypeScript and Vite build errors.
