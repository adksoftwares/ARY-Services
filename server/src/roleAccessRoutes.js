const ROLE_TYPES = new Set(['customer', 'provider', 'driver']);
const PROVIDER_CATEGORIES = new Set(['electrical-repair', 'plumbing', 'food-shops', 'grocery-products', 'other-services']);
const DRIVER_TYPES = new Set(['food_delivery', 'ride', 'parcel_delivery']);

function rolesFor(user) {
  return [...new Set([...(user.accountType === 'admin' ? [] : ['customer']), ...(Array.isArray(user.roles) ? user.roles : []), user.accountType].filter(Boolean))];
}

function publicUser(user, token, activeRole = user.accountType) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    location: user.location || '',
    accountType: activeRole,
    roles: rolesFor(user),
    roleApplications: user.roleApplications || {},
    status: user.status,
    category: user.category || null,
    categoryName: user.categoryName || null,
    driverServices: user.driverServices || [],
    token
  };
}

export function registerRoleAccessRoutes(app, { requireAuth, requireAdmin, getUsers, updateUser, generateToken, broadcastEvent, recordAdminAudit }) {
  // Return the roles currently approved for this account and the status of pending requests.
  app.get('/api/auth/roles', requireAuth, async (req, res) => {
    const users = await getUsers();
    const user = users.find(item => item.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json({ roles: rolesFor(user), applications: user.roleApplications || {}, activeRole: req.user.accountType });
  });

  // Issue a fresh signed session for a role that is already approved on this account.
  app.post('/api/auth/active-role', requireAuth, async (req, res) => {
    const requestedRole = String(req.body?.role || '').toLowerCase();
    if (!ROLE_TYPES.has(requestedRole)) return res.status(400).json({ error: 'Choose a valid app role.' });
    const users = await getUsers();
    const user = users.find(item => item.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    if (!rolesFor(user).includes(requestedRole)) {
      return res.status(403).json({ error: 'This role has not been approved for your account.' });
    }
    if (requestedRole === 'provider' && user.accountType !== 'provider' && user.providerStatus !== 'active') {
      return res.status(403).json({ error: 'Provider access is not active.' });
    }
    const token = generateToken({
      id: user.id, fullName: user.fullName, phone: user.phone,
      email: user.email, accountType: requestedRole
    });
    res.json({ user: publicUser(user, token, requestedRole), token, activeRole: requestedRole });
  });

  // A signed-in Customer can request an additional Provider or Driver role without creating a duplicate account.
  app.post('/api/account/role-applications', requireAuth, async (req, res) => {
    const role = String(req.body?.role || '').toLowerCase();
    if (!['provider', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Only Provider or Driver roles can be requested here.' });
    }
    const users = await getUsers();
    const current = users.find(item => item.id === req.user.id);
    if (!current) return res.status(404).json({ error: 'Account not found.' });
    if (current.accountType === 'admin' || rolesFor(current).includes(role)) {
      return res.status(409).json({ error: 'This role is already assigned to your account.' });
    }
    const existing = current.roleApplications?.[role];
    if (existing?.status === 'pending') {
      return res.status(409).json({ error: 'Your application for this role is already pending.' });
    }

    const details = req.body?.details && typeof req.body.details === 'object' ? req.body.details : {};
    const application = {
      role,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      details: {}
    };

    if (role === 'provider') {
      const category = String(details.category || '');
      const location = String(details.location || current.location || '').trim();
      const nicNumber = String(details.nicNumber || '').trim().toUpperCase();
      const operatingMode = String(details.operatingMode || '').trim();
      const nsnNumber = String(details.nsnNumber || '').trim();
      if (!PROVIDER_CATEGORIES.has(category) || !location || !nicNumber || !operatingMode || !nsnNumber) {
        return res.status(400).json({ error: 'Provider applications require a valid category, business/service address, NIC number, operating mode and NSN number.' });
      }
      if (!/^([0-9]{9}[VX]|[0-9]{12})$/.test(nicNumber)) {
        return res.status(400).json({ error: 'Enter a valid Sri Lankan NIC number.' });
      }
      if (!['shop', 'online', 'mobile'].includes(operatingMode)) {
        return res.status(400).json({ error: 'Choose Shop-based, Online or Mobile / On-location as the operating mode.' });
      }
      if (nsnNumber.length > 40) {
        return res.status(400).json({ error: 'NSN number must be 40 characters or fewer.' });
      }
      application.details = {
        category, categoryName: String(details.categoryName || category).slice(0, 100),
        location: location.slice(0, 300), nicNumber,
        operatingMode,
        nsnNumber,
        baseCharge: String(details.baseCharge || '').trim().slice(0, 40) || null
      };
    } else {
      const driverServices = [...new Set((Array.isArray(details.driverServices) ? details.driverServices : []).map(String).filter(value => DRIVER_TYPES.has(value)))];
      if (!driverServices.length) return res.status(400).json({ error: 'Select Passenger Ride, Shop & Grocery Delivery, or both.' });
      application.details = { driverServices };
    }

    const updated = await updateUser(current.id, user => {
      user.roles = rolesFor(user);
      user.roleApplications = { ...(user.roleApplications || {}), [role]: application };
      if (role === 'provider') user.providerStatus = 'pending';
      return user;
    });
    broadcastEvent?.('user:role_application_created', { userId: current.id, role, application });
    res.status(201).json({ application, roles: rolesFor(updated || current) });
  });

  app.get('/api/admin/role-applications', requireAdmin, async (_req, res) => {
    const users = await getUsers();
    const applications = [];
    const seen = new Set();

    for (const user of users) {
      // 1. Direct registrations with status === 'pending'
      if (['provider', 'driver'].includes(user.accountType) && user.status === 'pending') {
        const key = `${user.id}:${user.accountType}`;
        seen.add(key);
        const existingApp = user.roleApplications?.[user.accountType];
        applications.push({
          userId: user.id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          role: user.accountType,
          application: existingApp || {
            status: 'pending',
            requestedAt: user.createdAt || new Date().toISOString(),
            details: {
              category: user.category,
              categoryName: user.categoryName || user.category,
              location: user.location,
              nicNumber: user.nicNumber,
              nsnNumber: user.nsnNumber,
              operatingMode: user.operatingMode,
              baseCharge: user.baseCharge,
              driverServices: user.driverServices || []
            }
          }
        });
      }

      // 2. Existing users who applied for an additional role
      for (const [role, application] of Object.entries(user.roleApplications || {})) {
        const key = `${user.id}:${role}`;
        if (!seen.has(key) && application?.status === 'pending') {
          seen.add(key);
          applications.push({
            userId: user.id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            role,
            application
          });
        }
      }
    }
    res.json({ applications });
  });

  app.patch('/api/admin/role-applications/:userId/:role', requireAdmin, async (req, res) => {
    const { userId, role } = req.params;
    const decision = String(req.body?.status || '');
    if (!['approved', 'rejected'].includes(decision) || !['provider', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role application decision.' });
    }
    const users = await getUsers();
    const target = users.find(user => user.id === userId);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const application = target.roleApplications?.[role] || {
      status: 'pending',
      requestedAt: target.createdAt || new Date().toISOString(),
      details: {
        category: target.category,
        categoryName: target.categoryName,
        location: target.location,
        nicNumber: target.nicNumber,
        nsnNumber: target.nsnNumber,
        operatingMode: target.operatingMode,
        baseCharge: target.baseCharge,
        driverServices: target.driverServices || []
      }
    };

    const updated = await updateUser(userId, user => {
      const next = {
        ...(user.roleApplications?.[role] || application),
        status: decision,
        reviewedAt: new Date().toISOString(),
        reviewedBy: req.user.id
      };
      user.roleApplications = { ...(user.roleApplications || {}), [role]: next };
      if (decision === 'approved') {
        user.roles = [...new Set([...rolesFor(user), role])];
        user.status = 'active';
        user.kycStatus = 'verified';
        if (role === 'provider') {
          user.accountType = 'provider';
          user.providerStatus = 'active';
          if (application.details) {
            if (application.details.category) user.category = application.details.category;
            if (application.details.categoryName) user.categoryName = application.details.categoryName;
            if (application.details.location) user.location = application.details.location;
            if (application.details.nicNumber) user.nicNumber = application.details.nicNumber;
            if (application.details.nsnNumber) user.nsnNumber = application.details.nsnNumber;
            if (application.details.operatingMode) user.operatingMode = application.details.operatingMode;
            if (application.details.baseCharge) user.baseCharge = application.details.baseCharge;
          }
        } else {
          user.accountType = 'driver';
          user.driverServices = application.details?.driverServices || user.driverServices || [];
          user.driverStatus = 'active';
        }
      } else {
        if (role === 'provider') {
          user.providerStatus = 'rejected';
        } else {
          user.driverStatus = 'rejected';
        }
        if (user.accountType === role) {
          user.status = 'rejected';
        }
      }
      return user;
    });

    await recordAdminAudit?.(req, 'role.application_reviewed', 'user', userId, { role, decision, reasonProvided: Boolean(String(req.body?.reason || '').trim()) });
    broadcastEvent?.('user:role_application_reviewed', { userId, role, status: decision });
    broadcastEvent?.('user:status_changed', { userId, status: updated.status });
    res.json({ status: 'ok', user: publicUser(updated), application: updated.roleApplications[role] });
  });
}
