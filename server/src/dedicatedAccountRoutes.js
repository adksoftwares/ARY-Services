import { fileURLToPath } from 'url';
import path from 'path';
import { readPersistentState, mutatePersistentState } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const driverDataFile = path.join(__dirname, '..', 'data', 'driver-services.json');
const groceryOrdersFile = path.join(__dirname, '..', 'data', 'grocery-orders.json');
const groceryProductsFile = path.join(__dirname, '..', 'data', 'grocery-products.json');

/**
 * Dedicated Account-Scoped APIs for ARY Services
 * 
 * Provides clean, fully isolated endpoints for:
 * 1. Customer Portal  (/api/customer/*)
 * 2. Partner Pro Hub   (/api/provider/*)
 * 3. Driver & Courier  (/api/driver/*)
 * 4. Super Admin Console (/api/admin/*)
 */
export function registerDedicatedAccountRoutes(app, {
  requireAuth,
  requireAdmin,
  publishEvent,
  getBookings,
  getUsers,
  updateUser,
  recordAdminAudit
}) {

  // =========================================================================
  // 1. CUSTOMER PORTAL DEDICATED APIS (/api/customer/*)
  // =========================================================================

  // Customer Profile & Dashboard
  app.get('/api/customer/profile', requireAuth, async (req, res) => {
    try {
      const users = await getUsers();
      const me = users.find(u => u.id === req.user.id);
      if (!me) return res.status(404).json({ error: 'Customer not found.' });

      const allBookings = await getBookings();
      const myBookings = allBookings.filter(b => b.customerId === me.id);
      
      const allGroceryOrders = await readPersistentState('grocery_orders', groceryOrdersFile, []);
      const myGroceryOrders = allGroceryOrders.filter(o => o.customerId === me.id);

      const driverState = await readPersistentState('driver-services', driverDataFile, { jobs: [] });
      const myMobility = (driverState.jobs || []).filter(j => j.customerId === me.id);

      res.json({
        profile: {
          id: me.id,
          fullName: me.fullName,
          phone: me.phone,
          email: me.email,
          location: me.location,
          coordinates: me.coordinates || null,
          accountType: me.accountType,
          status: me.status,
          createdAt: me.createdAt
        },
        summary: {
          activeBookings: myBookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status)).length,
          completedBookings: myBookings.filter(b => b.status === 'completed').length,
          totalGroceryOrders: myGroceryOrders.length,
          activeMobilityTrips: myMobility.filter(m => !['completed', 'cancelled'].includes(m.status)).length
        }
      });
    } catch (err) {
      console.error('Customer profile error:', err);
      res.status(500).json({ error: 'Could not fetch customer profile.' });
    }
  });

  // Customer Active Bookings List
  app.get('/api/customer/bookings', requireAuth, async (req, res) => {
    try {
      const allBookings = await getBookings();
      const myBookings = allBookings
        .filter(b => b.customerId === req.user.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res.json({ bookings: myBookings });
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch customer bookings.' });
    }
  });

  // Customer Grocery Orders
  app.get('/api/customer/orders', requireAuth, async (req, res) => {
    try {
      const orders = await readPersistentState('grocery_orders', groceryOrdersFile, []);
      const myOrders = orders
        .filter(o => o.customerId === req.user.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res.json({ orders: myOrders });
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch customer orders.' });
    }
  });

  // Customer Mobility Requests (Rides, Parcels, Food)
  app.get('/api/customer/mobility', requireAuth, async (req, res) => {
    try {
      const driverState = await readPersistentState('driver-services', driverDataFile, { jobs: [] });
      const myJobs = (driverState.jobs || [])
        .filter(j => j.customerId === req.user.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res.json({ jobs: myJobs });
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch customer mobility requests.' });
    }
  });

  // =========================================================================
  // 2. PARTNER PRO PORTAL DEDICATED APIS (/api/provider/*)
  // =========================================================================

  // Provider Overview KPI Dashboard
  app.get('/api/provider/dashboard', requireAuth, async (req, res) => {
    try {
      const users = await getUsers();
      const me = users.find(u => u.id === req.user.id);
      if (!me) return res.status(404).json({ error: 'Provider not found.' });

      const allBookings = await getBookings();
      const myBookings = allBookings.filter(b => b.providerId === me.id);
      
      const pendingJobs = myBookings.filter(b => b.status === 'pending');
      const activeJobs = myBookings.filter(b => ['accepted', 'in_progress'].includes(b.status));
      const completedJobs = myBookings.filter(b => b.status === 'completed');

      // Calculate total earnings from completed jobs
      const totalEarned = completedJobs.reduce((sum, b) => {
        const val = Number(String(b.finalPrice || b.baseCharge || 0).replace(/[^\d.]/g, ''));
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);

      // Check grocery store orders if applicable
      const allGroceryOrders = await readPersistentState('grocery_orders', groceryOrdersFile, []);
      const myStoreOrders = allGroceryOrders.filter(o => o.providerId === me.id);

      res.json({
        provider: {
          id: me.id,
          fullName: me.fullName,
          phone: me.phone,
          category: me.category,
          categoryName: me.categoryName,
          status: me.status,
          providerStatus: me.providerStatus,
          isOnline: me.isOnline === true,
          rating: me.rating || 5.0,
          totalReviews: me.totalReviews || 0,
          approvedServices: me.approvedServices || []
        },
        kpis: {
          pendingRequests: pendingJobs.length,
          activeJobsCount: activeJobs.length,
          completedJobsCount: completedJobs.length,
          totalEarnedLkr: totalEarned,
          storeOrdersCount: myStoreOrders.length
        },
        recentJobs: myBookings.slice(0, 10)
      });
    } catch (err) {
      console.error('Provider dashboard error:', err);
      res.status(500).json({ error: 'Could not fetch provider dashboard.' });
    }
  });

  // Provider Assigned & Broadcasted Jobs
  app.get('/api/provider/jobs', requireAuth, async (req, res) => {
    try {
      const allBookings = await getBookings();
      const myCategory = req.user.category;
      
      const jobs = allBookings.filter(b => {
        // Direct assignment to this provider
        if (b.providerId === req.user.id) return true;
        // Broadcast pool jobs in provider's approved category
        if (b.status === 'broadcast_pool' && (!myCategory || b.categorySlug === myCategory)) return true;
        return false;
      }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      res.json({ jobs });
    } catch (err) {
      res.status(500).json({ error: 'Could not fetch provider jobs.' });
    }
  });

  // =========================================================================
  // 3. DRIVER & COURIER PORTAL DEDICATED APIS (/api/driver/*)
  // =========================================================================

  // Driver HUD Overview & Radar
  app.get('/api/driver/dashboard', requireAuth, async (req, res) => {
    try {
      const driverState = await readPersistentState('driver-services', driverDataFile, { jobs: [], presence: {} });
      const myPresence = driverState.presence?.[req.user.id] || { online: false };
      
      const allJobs = driverState.jobs || [];
      const myActiveJob = allJobs.find(j => j.driverId === req.user.id && ['claimed', 'arrived_pickup', 'picked_up', 'in_transit'].includes(j.status));
      const myCompletedTrips = allJobs.filter(j => j.driverId === req.user.id && j.status === 'delivered');

      // Available jobs currently looking for drivers
      const availableRadarJobs = (myPresence.online === true)
        ? allJobs.filter(j => j.status === 'requested' || j.status === 'broadcasted')
        : [];

      // Calculate total cash collected and earnings
      const todayTotal = myCompletedTrips.reduce((acc, t) => acc + (Number(t.estimatedFare || t.fare || 0) || 0), 0);

      res.json({
        presence: myPresence,
        activeJob: myActiveJob || null,
        availableRadarJobs,
        stats: {
          todayTripsCount: myCompletedTrips.length,
          todayEarningsLkr: todayTotal,
          rating: 4.9
        }
      });
    } catch (err) {
      console.error('Driver dashboard error:', err);
      res.status(500).json({ error: 'Could not fetch driver dashboard.' });
    }
  });

  // =========================================================================
  // 4. SUPER ADMIN PORTAL DEDICATED APIS (/api/admin/*)
  // =========================================================================

  // Admin Consolidated Executive Dashboard
  app.get('/api/admin/executive-dashboard', requireAdmin, async (_req, res) => {
    try {
      const users = await getUsers();
      const bookings = await getBookings();
      const driverState = await readPersistentState('driver-services', driverDataFile, { jobs: [], presence: {} });
      const groceryOrders = await readPersistentState('grocery_orders', groceryOrdersFile, []);

      // User breakdowns
      const customersCount = users.filter(u => u.accountType === 'customer' || !u.accountType).length;
      const providersCount = users.filter(u => u.accountType === 'provider').length;
      const verifiedProvidersCount = users.filter(u => u.accountType === 'provider' && u.providerStatus === 'approved').length;
      const driversCount = users.filter(u => u.accountType === 'driver' || (Array.isArray(u.roles) && u.roles.includes('driver'))).length;
      
      // Drivers online right now
      const onlineDriversCount = Object.values(driverState.presence || {}).filter(p => p && p.online === true).length;

      // Platform Financials Calculation
      const completedBookings = bookings.filter(b => b.status === 'completed');
      const grossServiceVolume = completedBookings.reduce((sum, b) => {
        const val = Number(String(b.finalPrice || b.baseCharge || 0).replace(/[^\d.]/g, ''));
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);

      const completedOrders = groceryOrders.filter(o => o.status === 'delivered');
      const grossGroceryVolume = completedOrders.reduce((sum, o) => sum + (Number(o.total || 0) || 0), 0);

      const totalGrossVolume = grossServiceVolume + grossGroceryVolume;
      const platformRevenueLkr = Math.round(totalGrossVolume * 0.10); // Standard 10% platform commission

      res.json({
        executive: {
          totalUsers: users.length,
          customersCount,
          providersCount,
          verifiedProvidersCount,
          driversCount,
          onlineDriversCount,
          activeBookingsCount: bookings.filter(b => ['pending', 'accepted', 'in_progress', 'broadcast_pool'].includes(b.status)).length,
          completedBookingsCount: completedBookings.length,
          totalGroceryOrders: groceryOrders.length,
          activeMobilityJobs: (driverState.jobs || []).filter(j => !['completed', 'delivered', 'cancelled'].includes(j.status)).length,
          financials: {
            grossVolumeLkr: totalGrossVolume,
            platformRevenueLkr,
            currency: 'LKR'
          }
        }
      });
    } catch (err) {
      console.error('Admin executive dashboard error:', err);
      res.status(500).json({ error: 'Could not fetch executive dashboard.' });
    }
  });

  console.log('✅ Dedicated Account-Scoped APIs successfully registered for Customer, Provider, Driver, and Admin.');
}
