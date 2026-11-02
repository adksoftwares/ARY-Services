# ARY Services — Application Structure

One GitHub repository, four independently runnable applications and one shared backend.

| App | Folder | Main features |
|---|---|---|
| Customer | `apps/customer` | Service discovery, grocery marketplace, mobility, bookings and reviews |
| Provider | `apps/provider` | Provider profile, service requests, bookings, quotations, reviews, earnings and Grocery |
| Driver | `apps/driver` | Driver onboarding, availability, jobs and location sharing |
| Admin | `apps/admin-dashboard` | User management, approvals, disputes and live dispatch |

Grocery is a module inside Provider, not a separate application.

Shared backend and UI/authentication utilities remain in repository-level `server/` and `src/`. Install once with `npm install`.

Commands: `npm run dev:customer`, `npm run dev:provider`, `npm run dev:driver`, `npm run dev:admin`; production builds use `npm run build:<app>`. Each app outputs to `dist/apps/<app>/`.

Legacy root entry points remain available during transition.
