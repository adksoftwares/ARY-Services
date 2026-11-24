# ARY Services — PickMe-Inspired Hybrid Platform Requirements

## Product direction

ARY Services is a Sri Lanka-focused hybrid marketplace combining:
1. Mobility and transport
2. Commerce and delivery
3. Local services

PickMe is a product benchmark for proven customer and operations workflows. ARY must use its own identity, navigation, service model, provider approval rules, business logic and UI. Do not copy PickMe branding, source code, proprietary assets, text, or exact screen designs.

## Non-negotiable ARY requirements

- Preserve existing ARY features, workflows, visual identity and working routes. Add capabilities without replacing or duplicating existing ones.
- Keep the four role experiences: Customer, Provider, Driver and Admin, with the existing shared identity and approved multi-role model.
- Provider onboarding continues to collect the user's required identity/business details, including Name, NSN number, Address and operating mode (shop-based, online or mobile/on-demand). Admin approval is required before activation.
- A provider's request to add a new service must be separately reviewed and approved by Admin before it becomes publicly bookable.
- Grocery Products remains a first-class provider service, with Sri Lankan grocery inventory, product units, stock and availability.
- Online payment / PayHere / escrow integration remains excluded until explicitly requested. Do not create fake payment success, wallet balances or held-fund records. Keep cash as the active payment option where currently supported.
- Do not run tests unless the user explicitly changes the previous no-testing instruction.

## 1. Mobility and ride-hailing

### Customer
- Choose pickup and destination using map search, current location (with permission), map pin and saved places.
- Show route distance, estimated travel time and an indicative fare before requesting.
- Select an available vehicle/service class where enabled.
- Request a ride, see matching status and driver acceptance.
- Show assigned driver's name, photo, vehicle type, registration/plate and rating where available.
- Show live driver approach and trip progress on a map when location permission and location updates are available.
- Use a trip-start PIN/OTP that the customer shares only when the assigned driver arrives.
- Show trip states, cancellation rules/fees (only if configured), trip receipt and rating/review.
- Provide trip sharing, emergency/SOS contact and report-issue entry points.

### Driver
- Toggle online/offline and set service/vehicle availability.
- Receive nearby eligible ride offers with pickup distance, destination area, estimated trip distance and fare estimate.
- Accept or decline within a configurable offer window.
- Navigate to pickup and destination using an external maps handoff or supported in-app map.
- Confirm arrival, validate customer start PIN, start trip, complete trip and report exceptions.
- Send location updates only while online/on an active job and with clear permission and privacy handling.
- View trip history, earnings summary and ratings.

### Matching and trip rules
- Match only approved, online drivers with a compatible vehicle/service type.
- Rank candidates using pickup distance/ETA and availability; prevent one driver accepting conflicting active jobs.
- Use an explicit state machine: requested → searching → offered → accepted → driver_arriving → arrived → in_progress → completed. Support cancelled and expired terminal states.
- Expire offers safely, retry the next eligible driver and prevent duplicate acceptance with transactional protection.
- Store fare estimate inputs and final fare breakdown. Fare formulas, minimum fare, per-km/per-minute rates, waiting charges and cancellation fees must be admin-configurable; do not invent live prices.
- A PIN must be verified server-side and must not be exposed in public API responses or logs.

## 2. Food, shops and grocery commerce

### Discovery
- Browse approved shops/providers by category and service area.
- Search products and shops; filter by category, price, availability, rating and delivery/pickup options.
- Display opening hours, current availability, delivery estimate and minimum order only when configured.
- Support restaurant/food menus and the existing grocery-products catalogue without duplicating catalogue systems.

### Catalogue and inventory
- Product fields should support name, description, category, images, SKU/barcode (optional), unit/pack size, selling price, stock quantity, low-stock threshold, availability and variants where needed.
- Sri Lankan grocery units should support item, kg, g, litre, ml, pack, bottle and locally relevant measures; quantities and unit prices must be unambiguous.
- Provider can create/update products, bulk-adjust stock, pause an item, mark out-of-stock and receive low-stock alerts.
- Reserve or re-check stock at checkout to prevent overselling; record stock movements for adjustments and fulfilled orders.
- Keep Admin moderation/approval where ARY's existing rules require it.

### Ordering
- Cart supports quantity changes, item notes, substitutions (customer choice), shop notes and delivery instructions.
- Validate shop availability, delivery area, stock and prices on the server at checkout.
- Show item subtotal, delivery fee, service fee/tax only when configured, discounts only when valid, and final total with a clear breakdown.
- Support scheduled orders only if provider capacity and time slots are configured.
- Custom food orders/special instructions should be supported without bypassing provider acceptance.
- Order lifecycle: placed → provider_confirmed → preparing/packing → ready_for_pickup → driver_assigned → picked_up → on_the_way → delivered. Support rejected, cancelled, unavailable-item and refund-review states.
- Customer can track status and driver handoff; provider can accept/reject and update preparation; driver can accept delivery and confirm pickup/drop-off with PIN or proof.
- Preserve cash payment path; online payments remain disabled until a real gateway is integrated and verified.

## 3. Parcel and on-demand delivery

- Customer creates a parcel request with pickup/drop-off contacts, phone numbers, addresses/map pins, parcel type, size/weight declaration, handling notes and optional declared value.
- Show an estimated delivery charge only from configured pricing rules.
- Driver offer includes pickup/drop-off area, distance, parcel class and payout estimate.
- Pickup confirmation uses sender PIN/OTP or evidence; delivery confirmation uses recipient PIN/OTP, signature/photo proof or an approved alternative.
- Track assigned → accepted → arriving_pickup → picked_up → in_transit → delivered; support failed_attempt, returned and cancelled.
- Protect recipient contact details and proof-of-delivery media; restrict access to the customer, assigned driver and authorized Admin.

## 4. Local services marketplace

- Browse services by category, location, provider rating and availability.
- Provider profile shows approved services, business/operating mode, service area, working hours, price basis (fixed/hourly/quote), portfolio and verified status.
- Customer submits booking with preferred date/time, location, description, photos where supported and quote requirements.
- Provider accepts, rejects or sends a quote; customer confirms quote before work begins.
- Booking lifecycle: requested → provider_review → quote_pending (if applicable) → confirmed → provider_en_route → in_progress → completed. Support cancelled, disputed and reschedule states.
- Preserve ARY's Admin approval for provider activation and each additional service request.

## 5. Provider operations

- Overview of new requests, active jobs/orders, completed jobs, cancellations and service performance.
- Availability controls by service, day and time; shop opening/closing and temporary pause.
- Product catalogue, stock levels, low-stock alerts and stock movement history for grocery/shop providers.
- Order preparation/fulfilment workflow and driver handoff.
- Earnings ledger showing gross amount, configured commission, adjustments and net payable; no fabricated wallet balance.
- Branch/location support only for providers who have multiple approved outlets; each branch has its own hours, service area, inventory and fulfilment settings.
- Ratings, customer feedback, issue responses and dispute status.

## 6. Driver operations

- Driver profile and Admin approval, vehicle details and service eligibility.
- Online/offline status, service type, operating zone and current job.
- Unified eligible-job inbox for rides, food/grocery deliveries and parcels, with job type clearly distinguished.
- Offer expiry, accept/decline, pickup/drop-off tasks, PIN/proof confirmation and exception reporting.
- Trip/delivery history, transparent earnings breakdown and performance/ratings.
- Avoid exposing customer data before a job is assigned and accepted.

## 7. Finance and ledger (without online payment integration)

- Record completed cash transactions and other actually supported payment events.
- Configurable provider/driver commission rules with effective dates and clear calculation snapshots.
- Refunds and adjustments must be Admin-reviewed ledger entries, not arbitrary balance edits.
- Provider/driver settlement statements and transaction history can be prepared, but no real-money payout automation until a payout provider/process is configured.
- Wallet UI must not imply stored value or cash-out capability unless backed by a compliant, funded ledger and real payment rails.
- Online escrow, PayHere and card processing remain disabled.

## 8. Safety, trust and support

- Verified provider/driver status and clear identity/vehicle details.
- Start/end PINs for rides and delivery handoffs; server-side verification and attempt limits.
- SOS/emergency contact shortcut and trip/order sharing where platform capabilities permit.
- Customer/provider/driver reviews after eligible completed work; one review per eligible transaction.
- Dispute/report issue workflow with evidence, status, Admin notes and resolution history.
- Fraud/risk signals: repeated cancellations, suspicious account/device/phone patterns, location anomalies and abuse of promotions. Flag for Admin review; do not silently auto-ban based only on a heuristic.
- Notifications for booking/order/job state changes, offer expiry, provider decisions and dispute updates. Support in-app first; SMS/push channels require configured providers and consent.
- Audit trail for Admin approvals, price/commission changes, refunds, suspensions and sensitive account actions.

## 9. Admin control centre

- Separate queues for provider applications, driver applications, provider service-addition requests, disputes and flagged activity.
- Manage categories, service types, vehicle classes, delivery zones, configurable fare/fee/commission rules and service availability.
- Monitor rides, orders, parcels and service bookings with filters and state history.
- Manage shop/provider verification, branches, catalog moderation and customer/driver support.
- Finance reports for gross volume, commissions, cash collections reported, adjustments, refunds and settlements; distinguish recorded amounts from confirmed cash received.
- Analytics for demand, completion/cancellation, matching time, fulfilment time, provider/driver performance and service-area coverage.
- Admin actions require role authorization and audit logging.

## 10. Real-time, location and privacy

- Use authenticated server events/WebSocket updates for job offers and status changes; clients must recover state after reconnecting.
- Persist authoritative job/order state server-side. Client UI must never decide that a job is accepted, paid or completed without server confirmation.
- Location access is opt-in and purpose-limited. Collect driver location only while online/on active work; customer location only for selected location-based actions.
- Do not expose precise location or personal phone numbers to unrelated users.
- Use map/geocoding/directions providers through server-configured keys; never hard-code secrets. Gracefully fall back to address text if map service is unavailable.

## 11. Sri Lanka localization

- Default currency: LKR, with server-side decimal-safe calculations.
- Phone numbers normalized to Sri Lankan E.164 where applicable.
- Address entry supports house/street, village/town, district and map pin/landmark.
- UI should be prepared for Tamil, Sinhala and English labels and content.
- Configure service zones, operating hours and delivery coverage rather than assuming nationwide availability.
- Support local grocery units and locally meaningful address/phone formats.

## Implementation order

1. Audit current ARY screens, APIs, storage and mobile wrappers; map each requirement to existing functionality before changing code.
2. Close mobility gaps: fare configuration, driver matching, offers, trip PIN, state transitions and location privacy.
3. Close commerce gaps: shop discovery, catalogue/stock validation, cart/checkout, order lifecycle and delivery handoff.
4. Add parcel workflow and proof of delivery.
5. Expand local-service quote/scheduling workflow while preserving provider/service approvals.
6. Complete provider/driver operations, admin controls, audit trail and finance reporting.
7. Connect all real-time events and responsive customer/provider/driver/admin experiences.
8. Keep online payments excluded until explicitly approved and integrated with a real provider.

## Release safeguards

- No destructive replacement of existing ARY flows; migrate data compatibly.
- No fake GPS, fare, payment, wallet, escrow, driver matching or delivery-completion success states.
- Keep all secrets server-side and all authorization enforced by the API.
- The owner has instructed that tests should not be run for this work; implementation changes must not be described as tested.
