import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPersistentState, mutatePersistentState } from './storage.js';
import { calculateDistanceKm, estimateEtaMinutes } from './geoService.js';

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'driver-services.json');
const emptyDriverState = { applications: [], jobs: [], driverProfiles: [] };
async function mutateJobs(mutator) {
  return mutatePersistentState('driver-services', dataFile, emptyDriverState, mutator);
}
async function readJobs() {
  const state = await readPersistentState('driver-services', dataFile, emptyDriverState);
  return { applications: state.applications || [], jobs: state.jobs || [], driverProfiles: state.driverProfiles || [] };
}
const id = prefix => prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const types = ['food_delivery', 'ride', 'parcel_delivery'];
const now = () => new Date().toISOString();
const validPoint = point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))
  && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
const cleanPoint = point => ({ lat: Number(point.lat), lng: Number(point.lng) });
const pinHash = pin => crypto.scryptSync(String(pin), process.env.OTP_SHIELD_SECRET || 'ary-local-pin-salt-change-before-production', 32).toString('hex');
const verifyPin = (pin, hash) => {
  if (!/^\d{6}$/.test(String(pin || '')) || !hash) return false;
  const actual = Buffer.from(pinHash(pin), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
function fareFor(distanceKm, serviceType = 'ride') {
  const prefix = serviceType === 'ride' ? 'RIDE' : 'DELIVERY';
  const base = Number(process.env[prefix + '_BASE_FARE_LKR']);
  const perKm = Number(process.env[prefix + '_PER_KM_LKR']);
  const minimum = Number(process.env[prefix + '_MIN_FARE_LKR']);
  if (![base, perKm, minimum].every(Number.isFinite) || base < 0 || perKm < 0 || minimum < 0) return null;
  const distanceCharge = Math.ceil(distanceKm * perKm);
  const total = Math.max(minimum, Math.ceil(base + distanceCharge));
  return { currency: 'LKR', baseFare: base, distanceKm, perKmRate: perKm, distanceCharge, total, pricingVersion: process.env[prefix + '_PRICING_VERSION'] || '1' };
}
function publicJob(job, viewerId) {
  const { startPinHash, pinAttempts, ...safe } = job;
  if (job.customerId === viewerId) safe.startPin = job.startPinForCustomer || null;
  delete safe.startPinForCustomer;
  return safe;
}
function driverTypeForJob(job) {
  return job.serviceType === 'parcel_delivery' ? 'parcel_delivery' : job.serviceType;
}

export function registerDriverServiceRoutes(app, { requireAuth, requireAdmin, broadcastEvent, getBookings, getUsers }) {
  app.get('/api/mobility/fare-estimate', async (req, res) => {
    const pickup = { lat: req.query.pickupLat, lng: req.query.pickupLng };
    const destination = { lat: req.query.destinationLat, lng: req.query.destinationLng };
    if (!validPoint(pickup) || !validPoint(destination)) return res.status(400).json({ error: 'Select valid pickup and destination map coordinates to calculate a fare.' });
    const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const serviceType = ['ride', 'parcel_delivery'].includes(req.query.serviceType) ? req.query.serviceType : 'ride';
    const fare = fareFor(distanceKm, serviceType);
    if (!fare) return res.status(503).json({ error: 'Fare pricing is not configured yet. Please contact ARY support.' });
    res.json({ estimate: { ...fare, etaMinutes: estimateEtaMinutes(distanceKm), disclaimer: 'Indicative estimate only. Final fare follows the configured ARY pricing rules.' } });
  });

  app.post('/api/driver/availability', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Driver account required.' });
    const online = req.body?.online === true;
    const state = await mutateJobs(data => {
      let profile = data.driverProfiles.find(item => item.userId === req.user.id);
      if (!profile) { profile = { userId: req.user.id, online: false }; data.driverProfiles.push(profile); }
      profile.online = online;
      profile.updatedAt = now();
      return profile;
    });
    broadcastEvent?.('driver:availability_updated', { userId: req.user.id, online: state.online });
    res.json({ availability: state });
  });

  app.post('/api/driver/location', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Driver account required.' });
    if (!validPoint(req.body?.location)) return res.status(400).json({ error: 'A valid GPS location is required.' });
    const location = cleanPoint(req.body.location);
    const state = await mutateJobs(data => {
      const profile = data.driverProfiles.find(item => item.userId === req.user.id);
      if (!profile?.online) return null;
      profile.location = location;
      profile.locationUpdatedAt = now();
      for (const job of data.jobs) if (job.driverId === req.user.id && !['completed', 'cancelled'].includes(job.status)) job.driverLocation = location;
      return profile;
    });
    if (!state) return res.status(409).json({ error: 'Go online before sharing driver location.' });
    broadcastEvent?.('driver:location_updated', { driverId: req.user.id, location });
    res.json({ success: true });
  });

  app.post('/api/driver-applications', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Only registered Driver accounts can apply to driver networks.' });
    const requested = Array.isArray(req.body?.driverTypes) ? req.body.driverTypes : [req.body?.driverType];
    const driverTypes = [...new Set(requested.map(String).filter(type => types.includes(type)))];
    if (!driverTypes.length) return res.status(400).json({ error: 'Choose Ride, Food Delivery, Parcel Delivery, or a combination.' });
    const applications = await mutateJobs(data => {
      const submitted = [];
      for (const driverType of driverTypes) {
        let existing = data.applications.find(a => a.userId === req.user.id && a.driverType === driverType && ['pending', 'approved'].includes(a.status));
        if (!existing) {
          existing = { id: id('drvapp'), userId: req.user.id, driverName: req.user.fullName, driverType, status: 'pending', createdAt: now() };
          data.applications.push(existing);
        }
        submitted.push(existing);
      }
      return submitted;
    });
    broadcastEvent?.('driver:application_created', { userId: req.user.id, applications });
    res.status(201).json({ applications });
  });

  app.get('/api/admin/driver-applications', requireAdmin, async (_req, res) => {
    const d = await readJobs();
    res.json({ applications: d.applications });
  });

  app.patch('/api/admin/driver-applications/:id', requireAdmin, async (req, res) => {
    const status = String(req.body?.status || '');
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected.' });
    const a = await mutateJobs(d => {
      const item = d.applications.find(x => x.id === req.params.id);
      if (!item) return null;
      item.status = status; item.reviewedAt = now(); item.reviewedBy = req.user.id;
      return item;
    });
    if (!a) return res.status(404).json({ error: 'Application not found.' });
    broadcastEvent?.('driver:application_reviewed', { userId: a.userId, application: a });
    res.json({ application: a });
  });

  app.post('/api/food-deliveries', requireAuth, async (req, res) => {
    const { orderReference, pickupAddress, dropoffAddress, notes = '', pickupLocation, dropoffLocation } = req.body || {};
    if (!orderReference || !pickupAddress || !dropoffAddress) return res.status(400).json({ error: 'A valid food order reference, pickup and delivery addresses are required.' });
    const orders = await getBookings();
    const order = orders.find(b => b.id === String(orderReference) && b.customerId === req.user.id && String(b.categorySlug || '').toLowerCase().includes('food'));
    if (!order) return res.status(404).json({ error: 'Food order not found for this customer.' });
    if (!['accepted', 'preparing', 'ready'].includes(order.status)) return res.status(409).json({ error: 'The shop must accept or prepare the food order before delivery can be requested.' });
    const users = await getUsers();
    const restaurant = users.find(u => u.id === order.providerId);
    const job = {
      id: id('food'), serviceType: 'food_delivery', customerId: req.user.id, customerName: req.user.fullName,
      orderReference: order.id, restaurantName: String(order.providerName || 'Food Shop').slice(0, 160),
      pickupAddress: String(pickupAddress).slice(0, 500), destinationAddress: String(dropoffAddress).slice(0, 500),
      pickupLocation: validPoint(pickupLocation) ? cleanPoint(pickupLocation) : null,
      destinationLocation: validPoint(dropoffLocation) ? cleanPoint(dropoffLocation) : null,
      notes: String(notes).slice(0, 500), driverId: null, status: 'requested', createdAt: now()
    };
    if (!restaurant) return res.status(409).json({ error: 'The shop account is no longer available.' });
    await mutateJobs(d => { d.jobs.unshift(job); });
    broadcastEvent?.('driver:job_created', { job });
    res.status(201).json({ job });
  });

  app.post('/api/ride-trips', requireAuth, async (req, res) => {
    const { pickupAddress, destinationAddress, passengerCount = 1, notes = '', pickupLocation, destinationLocation } = req.body || {};
    const count = Number(passengerCount);
    if (!pickupAddress || !destinationAddress || !validPoint(pickupLocation) || !validPoint(destinationLocation) || !Number.isInteger(count) || count < 1 || count > 6) {
      return res.status(400).json({ error: 'Valid pickup and destination addresses with map coordinates, and passenger count (1-6) are required.' });
    }
    const distanceKm = calculateDistanceKm(pickupLocation.lat, pickupLocation.lng, destinationLocation.lat, destinationLocation.lng);
    const fare = fareFor(distanceKm, 'ride');
    if (!fare) return res.status(503).json({ error: 'Ride pricing is not configured. ARY cannot accept this trip until fare rules are configured.' });
    const startPin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const job = {
      id: id('ride'), serviceType: 'ride', customerId: req.user.id, customerName: req.user.fullName,
      pickupAddress: String(pickupAddress).slice(0, 500), destinationAddress: String(destinationAddress).slice(0, 500),
      pickupLocation: cleanPoint(pickupLocation), destinationLocation: cleanPoint(destinationLocation),
      distanceKm, etaMinutes: estimateEtaMinutes(distanceKm), fare,
      passengerCount: count, notes: String(notes).slice(0, 500), driverId: null, driverLocation: null,
      status: 'requested', startPinHash: pinHash(startPin), startPinForCustomer: startPin, pinAttempts: 0, createdAt: now()
    };
    await mutateJobs(d => { d.jobs.unshift(job); });
    broadcastEvent?.('driver:job_created', { job: publicJob(job, 'dispatch') });
    res.status(201).json({ job: publicJob(job, req.user.id) });
  });

  app.post('/api/parcels', requireAuth, async (req, res) => {
    const { pickupAddress, destinationAddress, pickupContact, recipientContact, parcelType = 'standard', weightKg, notes = '', pickupLocation, destinationLocation } = req.body || {};
    const weight = Number(weightKg);
    if (!pickupAddress || !destinationAddress || !pickupContact || !recipientContact || !validPoint(pickupLocation) || !validPoint(destinationLocation) || !Number.isFinite(weight) || weight <= 0 || weight > 100) {
      return res.status(400).json({ error: 'Enter pickup/drop-off addresses, contact details, valid map locations and parcel weight (0-100kg).' });
    }
    const distanceKm = calculateDistanceKm(pickupLocation.lat, pickupLocation.lng, destinationLocation.lat, destinationLocation.lng);
    const fare = fareFor(distanceKm, 'parcel_delivery');
    if (!fare) return res.status(503).json({ error: 'Parcel pricing is not configured. ARY cannot accept this parcel until delivery pricing is configured.' });
    const startPin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const job = {
      id: id('parcel'), serviceType: 'parcel_delivery', customerId: req.user.id, customerName: req.user.fullName,
      pickupAddress: String(pickupAddress).slice(0, 500), destinationAddress: String(destinationAddress).slice(0, 500),
      pickupContact: String(pickupContact).slice(0, 120), recipientContact: String(recipientContact).slice(0, 120),
      parcelType: String(parcelType).slice(0, 60), weightKg: weight, notes: String(notes).slice(0, 500),
      pickupLocation: cleanPoint(pickupLocation), destinationLocation: cleanPoint(destinationLocation),
      distanceKm, etaMinutes: estimateEtaMinutes(distanceKm), fare, driverId: null, driverLocation: null,
      status: 'requested', pickupPinHash: pinHash(startPin), pickupPinForCustomer: startPin, pinAttempts: 0, createdAt: now()
    };
    await mutateJobs(d => { d.jobs.unshift(job); });
    broadcastEvent?.('driver:job_created', { job: publicJob(job, 'dispatch') });
    res.status(201).json({ job: { ...publicJob(job, req.user.id), pickupPin: startPin } });
  });

  app.get('/api/driver-jobs', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Driver account required.' });
    const d = await readJobs();
    const approved = d.applications.filter(a => a.userId === req.user.id && a.status === 'approved').map(a => a.driverType);
    const profile = d.driverProfiles.find(p => p.userId === req.user.id);
    const jobs = d.jobs.filter(j => approved.includes(driverTypeForJob(j)) && (j.status === 'requested' || j.driverId === req.user.id))
      .map(j => publicJob(j, req.user.id));
    res.json({ jobs, approvedDriverTypes: approved, online: Boolean(profile?.online) });
  });

  app.post('/api/driver-jobs/:id/claim', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Driver account required.' });
    try {
      const result = await mutateJobs(d => {
        const job = d.jobs.find(j => j.id === req.params.id);
        if (!job) return { status: 404, error: 'Job not found.' };
        const approved = d.applications.some(a => a.userId === req.user.id && a.driverType === driverTypeForJob(job) && a.status === 'approved');
        const profile = d.driverProfiles.find(p => p.userId === req.user.id);
        if (!approved) return { status: 403, error: 'You are not approved for this driver network.' };
        if (!profile?.online) return { status: 409, error: 'Go online before accepting jobs.' };
        if (job.status !== 'requested' || job.driverId) return { status: 409, error: 'This job has already been accepted by another driver.' };
        if (job.pickupLocation && profile.location) {
          const distance = calculateDistanceKm(profile.location.lat, profile.location.lng, job.pickupLocation.lat, job.pickupLocation.lng);
          if (distance > Number(process.env.DRIVER_MAX_PICKUP_KM || 35)) return { status: 409, error: 'This job is outside your current service radius.' };
          job.driverPickupDistanceKm = distance;
        }
        job.driverId = req.user.id; job.driverName = req.user.fullName; job.driverLocation = profile.location || null;
        job.status = 'accepted'; job.acceptedAt = now();
        return { status: 200, job };
      });
      if (result.error) return res.status(result.status).json({ error: result.error });
      broadcastEvent?.('driver:job_updated', { job: publicJob(result.job, 'dispatch') });
      return res.json({ job: publicJob(result.job, req.user.id) });
    } catch {
      return res.status(500).json({ error: 'Could not claim driver job.' });
    }
  });

  app.patch('/api/driver-jobs/:id/status', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Driver account required.' });
    const status = String(req.body?.status || '');
    const result = await mutateJobs(d => {
      const job = d.jobs.find(j => j.id === req.params.id);
      if (!job) return { status: 404, error: 'Job not found.' };
      if (job.driverId !== req.user.id) return { status: 403, error: 'Only the assigned driver can update this job.' };
      const transitions = {
        accepted: ['arrived_pickup', 'arrived'],
        arrived_pickup: ['picked_up'],
        arrived: ['in_progress'],
        picked_up: ['in_transit', 'completed'],
        in_progress: ['completed'],
        in_transit: ['delivered']
      };
      if (!transitions[job.status]?.includes(status)) return { status: 409, error: 'Invalid job status transition.' };
      job.status = status; job.updatedAt = now();
      return { status: 200, job };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    broadcastEvent?.('driver:job_updated', { job: publicJob(result.job, 'dispatch') });
    res.json({ job: publicJob(result.job, req.user.id) });
  });

  app.post('/api/driver-jobs/:id/verify-pickup', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Driver account required.' });
    const pin = String(req.body?.pin || '');
    const result = await mutateJobs(d => {
      const job = d.jobs.find(j => j.id === req.params.id);
      if (!job) return { status: 404, error: 'Job not found.' };
      if (job.driverId !== req.user.id) return { status: 403, error: 'Only the assigned driver can verify pickup.' };
      if (job.status !== 'arrived_pickup' && job.status !== 'arrived') return { status: 409, error: 'Driver must arrive at pickup first.' };
      if ((job.pinAttempts || 0) >= 5) return { status: 429, error: 'PIN attempts exceeded. Contact ARY support.' };
      const hash = job.serviceType === 'parcel_delivery' ? job.pickupPinHash : job.startPinHash;
      if (!verifyPin(pin, hash)) { job.pinAttempts = (job.pinAttempts || 0) + 1; return { status: 400, error: 'Incorrect pickup PIN.' }; }
      job.status = job.serviceType === 'parcel_delivery' || job.serviceType === 'food_delivery' ? 'picked_up' : 'in_progress';
      job.pickupVerifiedAt = now(); job.pinAttempts = 0;
      return { status: 200, job };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    broadcastEvent?.('driver:job_updated', { job: publicJob(result.job, 'dispatch') });
    res.json({ job: publicJob(result.job, req.user.id) });
  });

  app.post('/api/driver-jobs/:id/verify-delivery', requireAuth, async (req, res) => {
    if (req.user.accountType !== 'driver') return res.status(403).json({ error: 'Driver account required.' });
    const pin = String(req.body?.pin || '');
    const result = await mutateJobs(d => {
      const job = d.jobs.find(j => j.id === req.params.id);
      if (!job) return { status: 404, error: 'Job not found.' };
      if (job.driverId !== req.user.id) return { status: 403, error: 'Only the assigned driver can verify delivery.' };
      if (!['picked_up', 'in_transit', 'in_progress'].includes(job.status)) return { status: 409, error: 'Pickup must be verified first.' };
      if ((job.deliveryPinAttempts || 0) >= 5) return { status: 429, error: 'Delivery PIN attempts exceeded. Contact ARY support.' };
      if (!verifyPin(pin, job.deliveryPinHash || job.startPinHash)) { job.deliveryPinAttempts = (job.deliveryPinAttempts || 0) + 1; return { status: 400, error: 'Incorrect delivery PIN.' }; }
      job.status = job.serviceType === 'ride' ? 'completed' : 'delivered';
      job.completedAt = now(); job.deliveryVerifiedAt = now(); job.deliveryPinAttempts = 0;
      return { status: 200, job };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    broadcastEvent?.('driver:job_updated', { job: publicJob(result.job, 'dispatch') });
    res.json({ job: publicJob(result.job, req.user.id) });
  });
}
