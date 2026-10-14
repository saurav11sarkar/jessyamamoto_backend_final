# Subscription list fix

## Cause and write behavior

`GET /api/v1/subscription` is mounted by `src/app.ts` and
`src/app/routes/routes.ts`. `subscription.routes.ts` routes it directly to
`subscriptionController.getAllSubscriptions`, without authentication middleware.
The controller calls `subscriptionService.getAllSubscriptions`, which calls the
private `normalizeDefaultSubscriptions` function in
`src/app/modules/subscription/subscription.service.ts` on every request.

Previously, that function performed:

1. Two reads for `quarterly` and `6month`; if only the quarterly plan existed,
   `findByIdAndUpdate` rewrote its type, title, price, booking fees, description,
   and content to the six-month defaults.
2. Four `findOneAndUpdate` upserts, filtered by exact plan type. Each supplied the
   whole default plan in `$setOnInsert`, together with `$set` containing `title`,
   `price`, `bookingFeePercent`, `bookingFeeMinimum`, `description`, and `content`.
   Those six paths occurred in both operators, causing MongoDB's conflicting
   update-path error. `type` was only in the filter and `$setOnInsert`; `features`
   is absent from this backend's subscription schema and seed values.

The intended old behavior was to insert missing defaults and refresh existing
plans. The fixed behavior inserts missing defaults only, including initial
`createdAt` and `updatedAt`, through `$setOnInsert`. The quarterly rewrite has
been removed. Per-query `timestamps: false` prevents Mongoose from injecting
`$set.updatedAt` into existing documents. Existing plan documents, including
administrator edits, subscriber/service arrays, and timestamps, are unchanged.

The GET still issues four upsert operations on every request. With all default
types present, these operations are no-ops. The list's query, filtering, sorting,
pagination, response envelope, and public access rules are unchanged. As confirmed
by the user, the existing response is preserved without adding `features: []`.

## Hooks, plugins, uniqueness, and other callers

The subscription schema enables Mongoose timestamps. Its automatic update
middleware normally adds `$set.updatedAt` and `$setOnInsert.createdAt`; defaults
are added to `$setOnInsert` by `setDefaultsOnInsert`. No custom subscription hooks
or application-wide/schema plugins were found. After the default upserts, the GET
only calls `find` and `countDocuments`. No other `updateOne`, `updateMany`, or
legacy `update` calls are reachable from this handler.

`subscription.model.ts` declares `type: { type: String, unique: true }`. The exact
upsert filter `{ type: plan.type }` matches the inserted type and the unique
index key. An enforced unique `{ type: 1 }` index prevents duplicate types,
including concurrent requests. Production index presence was not inspected;
the schema declaration alone does not prove that the physical index exists.

Only the list controller calls `subscriptionService.getAllSubscriptions`; only
that service function calls `normalizeDefaultSubscriptions`. The fix is local
to this path, without changing the shared model or timestamp middleware.

Other users of the same model, all unchanged:

| File | Function/use and endpoint |
| --- | --- |
| `src/app/modules/subscription/subscription.service.ts` | Separate create, single-read, admin-update, and admin-delete functions; `POST /api/v1/subscription`, `GET /api/v1/subscription/:id`, `PUT /api/v1/subscription/:id`, and `DELETE /api/v1/subscription/:id`. |
| `src/app/modules/booking/booking.service.ts` | `getFreeTierSubscription` has its own non-conflicting upsert; `getBookingPricing` reads paid plans. Used by `POST /api/v1/booking` and `GET /api/v1/booking/pricing-preview`. |
| `src/app/modules/service/service.service.ts` | `registerServiceAndSubscription` reads plans for checkout; `POST /api/v1/service/register-service`. |
| `src/app/helper/webHookHandler.ts` | Reads a plan and saves its subscriber array for subscription payments; `POST /webhook`. |
| `src/scripts/seed-client-test-data.ts` | Independent `upsertSubscription` helper called by the client test seed script. It is not called by the GET. |
| `src/app/modules/payment/payment.service.ts` | `getAllUserPayment` populates the subscription reference; `GET /api/v1/payment/user`. |
| `src/app/modules/user/user.model.ts`, `src/app/modules/payment/payment.model.ts` | Schema references to `Subscription`. |
| `src/app/helper/subscriptionCron.ts` | Updates user expiry flags only; does not use the subscription model or default-plan helper. |

Website/dashboard consumers of the list route, relative to `D:/jess`:

- `jessyamamoto_frontend_final/src/app/(website)/membership/page.tsx`
  requests `/subscription?limit=50` and derives feature text from `content`.
- `jessyamamoto_frontend_final/src/app/(website)/find-job/_components/steps/PricingStep.tsx`
  requests `/subscription`.
- `jessyamamoto_frontend_final/src/app/(website)/find-care/_components/steps/PricingStep.tsx`
  requests `/subscription`.
- `jessyamamoto_frontend_final/src/app/(website)/all-find-care/[id]/_components/booking.tsx`
  requests `/subscription?limit=20`.
- `jessyamamoto_dashboard_final/src/app/(dashboard)/dashboard/membership/_components/subscription-data.tsx`
  requests the paginated list with a Bearer token, and separately calls the admin
  create/update/delete endpoints. Website list requests omit the token.

## Local verification without a new test framework

The project has no test setup: `npm test` is a placeholder and no test database
or in-memory MongoDB dependency is installed. No framework was added.

Offline verification passed using the real subscription router and Mongoose
with collection doubles: 14 HTTP requests covered empty, existing, customized,
and legacy collections, pagination/filtering, requests with and without a Bearer
header, and repeated/concurrent calls. Assertions inspected all 56 generated
updates after Mongoose middleware, confirming `$setOnInsert` was the only
operator, no paths conflicted, existing documents remained unchanged, and the
schema declared a unique type index. This does not replace real MongoDB/index
verification. No database connections or `.env` loads occurred.

After implementation, `tsc --noEmit` passed. The project's test and lint commands
were each run once: `npm test` failed at its existing placeholder, and
`npm run lint` failed because ESLint 9 has no configuration file in this project.
These pre-existing setup issues were not changed.

Use an isolated local MongoDB database and a local-only environment. In
PowerShell, explicitly set these values before starting the development server
so dotenv cannot substitute the configured database URI:

```powershell
$env:MONGO_URI = 'mongodb://127.0.0.1:27017/jetset_subscription_local_test'
$env:NODE_ENV = 'test'
$env:PORT = '3000'
npm run dev
```

Use a fresh test database with an empty `subscriptions` collection. In another
terminal, run these requests, then repeat them with the now-populated collection:

```powershell
curl.exe -i 'http://127.0.0.1:3000/api/v1/subscription?page=1&limit=50'
curl.exe -i -H 'Authorization: Bearer LOCAL_TEST_ACCESS_TOKEN' 'http://127.0.0.1:3000/api/v1/subscription?page=1&limit=50'
curl.exe -i 'http://127.0.0.1:3000/api/v1/subscription?page=2&limit=2'
```

Expect HTTP 200, the existing `statusCode`, `success`, `message`, `meta`, and
`data` envelope, and `_id`, `type`, `title`, `price`, `description`, and `content`
on every plan. The first two responses should have `meta.total: 4`,
`meta.page: 1`, and `meta.limit: 50`; the third should have two plans,
`meta.page: 2`, and `meta.limit: 2`. Repeated requests must retain the same four
IDs and a collection count of four. Edit a plan's values in the local test
database, snapshot the complete documents, and repeat both token/no-token
requests; the snapshots, including timestamps and arrays, must remain identical.
For a legacy-case check, add a quarterly document only to the test database and
verify it remains unchanged after requests, while the missing six-month plan is
inserted separately. Check the unique type index in the test database as well.

## Deployment steps (not executed)

1. Run the verification above in a local/test or staging database before release.
2. Have the database operator verify the existing unique `{ type: 1 }` index on
   `subscriptions`. If absent, plan a separately reviewed index migration after
   inspecting existing duplicates. Do not run automatic data cleanup or
   `syncIndexes` as part of this fix.
3. Review and deploy the service-only code change using the normal release
   process; install dependencies, build TypeScript, and restart the backend.
   No production database commands, deployment commands, or production requests
   were run for this fix. No data migration is needed when the index exists.

Moving default-plan seeding out of the GET into an explicit startup/migration
step is a possible follow-up; it is outside this change.
