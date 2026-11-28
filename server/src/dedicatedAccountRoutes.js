import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPersistentState, mutatePersistentState } from './storage.js';

export function registerDedicatedAccountRoutes(app, {
  requireAuth,
  requireAdmin,
  getUsers,
  updateUser,
  getBookings,
  getReviews = async () => [],
  getLedgerEntries = async () => [],
  recordAdminAudit = async () => {}
}) {
  const driverDataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'driver-services.json');
  const groceryOrdersFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'grocery-orders.json');
  const emptyDriverState = { applications: [], jobs: [], presence: {} };

  async function getDriverState() {
    return await readPersistentState('driver-services', driverDataFile, emptyDriverState);
  }

  async function getGroceryOrders() {
    return await readPersistentState('grocery_orders', groceryOrdersFile, []);
  }

  // ==========================================================================
  // 1. DEDICATED CUSTOMER PORTAL APIS (/api/customer/*)
  // ==========================================================================

  // GET /api/customer/profile - Customer Profile & Account Summary
  app.get('/api/customer/profile', requireAuth, async (req, res) => {
    try {
      const users = await getUsers();
      const user = users.find(u => u.id === req.user.id) || req.user;
      const bookings = await getBookings();
      const userBookings = bookings.filter(b => b.customerId === req.user.id);
      const groceryOrders = await getGroceryOrders();
      const userGrocery = groceryOrders.filter(o => o.customerId === req.user.id);

      const driverState = await getDriverState();
      const userMobility = (driverState.jobs || []).filter(j => j.customerId === req.user.id);

      const completedBookings = userBookings.filter(b => b.status === 'completed');
      const activeBookings = userBookings.filter(b => ['requested', 'accepted', 'in_progress', 'quoted'].includes(b.status));
      const activeOrders = userGrocery.filter(o => !['delivered', 'cancelled'].includes(o.status)).length +
                           userMobility.filter(m => !['completed', 'cancelled'].includes(m.status)).length;

      const summary = {
        totalBookings: userBookings.length,
        completedBookings: completedBookings.length,
        activeBookings: activeBookings.length,
        activeOrders,
        totalSpent: completedBookings.reduce((sum, b) => sum + (Number(b.baseAmount) || 0), 0)
      };

      const { passwordHash: _, ...safeProfile } = user;
      res.json({
        profile: safeProfile,
        summary
      });
    } catch (err) {
      console.error('Customer profile API error:', err);
      res.status(500).json({ error: 'Failed to load customer profile.' });
    }
  });

  // GET /api/customer/bookings - Isolated Customer Bookings List
  app.get('/api/customer/bookings', requireAuth, async (req, res) => {
    try {
      const bookings = await getBookings();
      const userBookings = bookings
        .filter(b => b.customerId === req.user.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res.json({ bookings: userBookings });
    } catch (err) {
      console.error('Customer bookings API error:', err);
      res.status(500).json({ error: 'Failed to load customer bookings.' });
    }
  });

  // GET /api/customer/orders - Isolated Customer Grocery & Mobility Orders
  app.get('/api/customer/orders', requireAuth, async (req, res) => {
    try {
      const groceryOrders = await getGroceryOrders();
      const userGrocery = groceryOrders.filter(o => o.customerId === req.user.id);
      const driverState = await getDriverState();
      const userMobility = (driverState.jobs || []).filter(j => j.customerId === req.user.id);

      res.json({
        groceryOrders: userGrocery,
        mobilityJobs: userMobility
      });
    } catch (err) {
      console.error('Customer orders API error:', err);
      res.status(500).json({ error: 'Failed to load customer orders.' });
    }
  });

  // GET /api/customer/dashboard - Aggregated Customer Hub
  app.get('/api/customer/dashboard', requireAuth, async (req, res) => {
    try {
      const bookings = await getBookings();
      const userBookings = bookings.filter(b => b.customerId === req.user.id);
      const recent = userBookings.slice(0, 5);
      const active = userBookings.filter(b => ['requested', 'accepted', 'in_progress'].includes(b.status));

      res.json({
        recentBookings: recent,
        activeBookings: active,
        count: userBookings.length
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load customer dashboard.' });
    }
  });

  // ==========================================================================
  // 2. DEDICATED PARTNER PRO PORTAL APIS (/api/provider/*)
  // ==========================================================================

  // GET /api/provider/dashboard - Partner Pro Performance & KPI Metrics
  app.get('/api/provider/dashboard', requireAuth, async (req, res) => {
    try {
      const users = await getUsers();
      const provider = users.find(u => u.id === req.user.id) || req.user;
      const bookings = await getBookings();
      const providerBookings = bookings.filter(b => b.providerId === req.user.id);

      const completed = providerBookings.filter(b => b.status === 'completed');
      const inProgress = providerBookings.filter(b => b.status === 'in_progress');
      const pendingQuotes = providerBookings.filter(b => b.status === 'quoted' || b.quoteRequired);

      const totalEarnings = completed.reduce((sum, b) => sum + (Number(b.providerPayout) || Number(b.baseAmount) || 0), 0);
      const reviews = await getReviews();
      const providerReviews = reviews.filter(r => r.providerId === req.user.id);
      const avgRating = providerReviews.length > 0
        ? Number((providerReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / providerReviews.length).toFixed(1))
        : Number(provider.rating || 5.0);

      const completionRate = providerBookings.length > 0
        ? Math.round((completed.length / providerBookings.length) * 100)
        : 100;

      const kpis = {
        totalJobs: providerBookings.length,
        completedJobs: completed.length,
        inProgressJobs: inProgress.length,
        pendingQuotes: pendingQuotes.length,
        totalEarnings,
        walletBalance: provider.walletBalance || totalEarnings,
        rating: avgRating,
        reviewCount: providerReviews.length,
        completionRate
      };

      const { passwordHash: _, ...safeProvider } = provider;
      res.json({
        provider: safeProvider,
        kpis
      });
    } catch (err) {
      console.error('Provider dashboard API error:', err);
      res.status(500).json({ error: 'Failed to load provider dashboard.' });
    }
  });

  // GET /api/provider/jobs - Partner Pro Jobs & Tasks
  app.get('/api/provider/jobs', requireAuth, async (req, res) => {
    try {
      const bookings = await getBookings();
      const providerBookings = bookings
        .filter(b => b.providerId === req.user.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      res.json({ jobs: providerBookings });
    } catch (err) {
      console.error('Provider jobs API error:', err);
      res.status(500).json({ error: 'Failed to load provider jobs.' });
    }
  });

  // PATCH /api/provider/status - Partner Pro Online Status & Operating Mode
  app.patch('/api/provider/status', requireAuth, async (req, res) => {
    try {
      const { isOnline, operatingMode } = req.body;
      const updated = await updateUser(req.user.id, current => {
        if (typeof isOnline === 'boolean') current.isOnline = isOnline;
        if (operatingMode && ['shop', 'mobile', 'online'].includes(operatingMode)) {
          current.operatingMode = operatingMode;
        }
        current.updatedAt = new Date().toISOString();
        return current;
      });

      if (!updated) return res.status(404).json({ error: 'Provider not found.' });
      const { passwordHash: _, ...safeUpdated } = updated;
      res.json({ provider: safeUpdated, isOnline: safeUpdated.isOnline });
    } catch (err) {
      console.error('Provider status API error:', err);
      res.status(500).json({ error: 'Failed to update provider status.' });
    }
  });

  // ==========================================================================
  // 3. DEDICATED DRIVER & COURIER PORTAL APIS (/api/driver/*)
  // ==========================================================================

  // GET /api/driver/dashboard - Driver HUD Presence & Activity Metrics
  app.get('/api/driver/dashboard', requireAuth, async (req, res) => {
    try {
      const driverState = await getDriverState();
      const driverPresence = driverState.presence?.[req.user.id] || { online: false };
      const driverJobs = (driverState.jobs || []).filter(j => j.driverId === req.user.id);

      const today = new Date().toISOString().slice(0, 10);
      const todayJobs = driverJobs.filter(j => (j.createdAt || '').startsWith(today));
      const completedToday = todayJobs.filter(j => j.status === 'completed' || j.status === 'delivered');

      const todayEarnings = completedToday.reduce((sum, j) => sum + (Number(j.fare) || Number(j.driverPayout) || 0), 0);

      const stats = {
        totalTrips: driverJobs.length,
        todayTrips: completedToday.length,
        todayEarnings,
        rating: 4.9,
        acceptanceRate: 98
      };

      res.json({
        presence: driverPresence,
        stats
      });
    } catch (err) {
      console.error('Driver dashboard API error:', err);
      res.status(500).json({ error: 'Failed to load driver dashboard.' });
    }
  });

  // GET /api/driver/jobs - Driver Dispatched & History Jobs
  app.get('/api/driver/jobs', requireAuth, async (req, res) => {
    try {
      const driverState = await getDriverState();
      const allJobs = driverState.jobs || [];
      const myJobs = allJobs.filter(j => j.driverId === req.user.id || (j.status === 'broadcasted' && !j.driverId));

      res.json({ jobs: myJobs });
    } catch (err) {
      console.error('Driver jobs API error:', err);
      res.status(500).json({ error: 'Failed to load driver jobs.' });
    }
  });

  // ==========================================================================
  // 4. DEDICATED SUPER ADMIN PORTAL APIS (/api/admin/*)
  // ==========================================================================

  // GET /api/admin/executive-dashboard - Consolidated Executive Financials & Platform Pulse
  app.get('/api/admin/executive-dashboard', requireAdmin, async (_req, res) => {
    try {
      const users = await getUsers();
      const bookings = await getBookings();
      const driverState = await getDriverState();

      const customers = users.filter(u => u.accountType === 'customer' || !u.accountType);
      const providers = users.filter(u => u.accountType === 'provider');
      const drivers = users.filter(u => u.accountType === 'driver' || (u.roles || []).includes('driver'));
      const admins = users.filter(u => u.accountType === 'admin');

      const totalVolume = bookings.reduce((sum, b) => sum + (Number(b.baseAmount) || 0), 0);
      const platformFees = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (Number(b.platformFee) || 0), 0);

      const escrowLocked = bookings
        .filter(b => ['accepted', 'in_progress', 'quoted'].includes(b.status))
        .reduce((sum, b) => sum + (Number(b.baseAmount) || 0), 0);

      const totalSettled = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (Number(b.providerPayout) || Number(b.baseAmount) || 0), 0);

      const activeDisputes = bookings.filter(b => b.status === 'disputed' || b.disputeStatus === 'opened').length;
      const activeDispatches = (driverState.jobs || []).filter(j => ['assigned', 'in_transit', 'picking_up'].includes(j.status)).length;

      const executive = {
        financials: {
          totalVolume,
          platformFees,
          escrowLocked,
          totalSettled
        },
        userCounts: {
          customers: customers.length,
          providers: providers.length,
          drivers: drivers.length,
          admins: admins.length,
          total: users.length
        },
        activeDisputes,
        activeDispatches,
        totalBookings: bookings.length,
        systemHealth: 'optimal'
      };

      res.json({ executive });
    } catch (err) {
      console.error('Admin executive dashboard API error:', err);
      res.status(500).json({ error: 'Failed to load executive dashboard.' });
    }
  });
}
