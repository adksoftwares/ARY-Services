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

export function registerRoleAccessRoutes(app, { requireAuth, requireAdmin, getUsers, updateUser, generateToken, broadcastEvent }) {
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
    for (const user of users) {
      for (const [role, application] of Object.entries(user.roleApplications || {})) {
        if (application?.status === 'pending') {
          applications.push({
            userId: user.id, fullName: user.fullName, phone: user.phone,
            email: user.email, role, application
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
    const application = target?.roleApplications?.[role];
    if (!target || !application || application.status !== 'pending') {
      return res.status(404).json({ error: 'Pending role application not found.' });
    }

    const updated = await updateUser(userId, user => {
      const next = { ...user.roleApplications[role], status: decision, reviewedAt: new Date().toISOString(), reviewedBy: req.user.id };
      user.roleApplications = { ...user.roleApplications, [role]: next };
      if (decision === 'approved') {
        user.roles = [...new Set([...rolesFor(user), role])];
        if (role === 'provider') {
          Object.assign(user, {
            providerStatus: 'active',
            category: application.details.category,
            categoryName: application.details.categoryName,
            location: application.details.location,
            nicNumber: application.details.nicNumber,
            nsnNumber: application.details.nsnNumber || null,
            operatingMode: application.details.operatingMode,
            baseCharge: application.details.baseCharge,
            kycStatus: 'pending'
          });
        } else {
          user.driverServices = application.details.driverServices || [];
          user.driverStatus = 'active';
        }
      } else if (role === 'provider') {
        user.providerStatus = 'rejected';
      }
      return user;
    });
    broadcastEvent?.('user:role_application_reviewed', { userId, role, status: decision });
    res.json({ status: 'ok', user: publicUser(updated), application: updated.roleApplications[role] });
  });
}
