import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutatePersistentState, readPersistentState } from './storage.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, '..', 'data', 'grocery-products.json');
const COLLECTION = 'grocery_products';
const EMPTY_PRODUCTS = [];
const ordersFile = path.join(__dirname, '..', 'data', 'grocery-orders.json');
const EMPTY_ORDERS = [];

function cleanProduct(body = {}) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const product = {
    name: String(source.name || '').trim().slice(0, 120),
    category: String(source.category || 'Other').trim().slice(0, 80),
    brand: String(source.brand || '').trim().slice(0, 80),
    unitGroup: String(source.unitGroup || 'count'),
    unit: String(source.unit || 'piece'),
    packSize: Number(source.packSize),
    price: Number(source.price),
    stock: Number(source.stock),
    lowStock: Number(source.lowStock ?? 5),
    sku: String(source.sku || '').trim().slice(0, 80),
    description: String(source.description || '').trim().slice(0, 500),
    isAvailable: source.isAvailable !== false
  };

  if (
    !product.name ||
    !Number.isFinite(product.packSize) || product.packSize <= 0 ||
    !Number.isFinite(product.price) || product.price < 0 ||
    !Number.isSafeInteger(product.stock) || product.stock < 0 ||
    !Number.isSafeInteger(product.lowStock) || product.lowStock < 0
  ) {
    throw new Error('Enter a valid product name, pack size, price and whole-number stock quantity.');
  }

  const allowedUnits = {
    weight: ['g', 'kg'],
    volume: ['ml', 'L'],
    count: ['piece', 'egg_tray', 'dozen', 'pack', 'box', 'bottle', 'can', 'sachet'],
    length: ['cm', 'm'],
    area: ['sqft'],
    gas: ['kg_cylinder']
  };

  if (!allowedUnits[product.unitGroup]?.includes(product.unit)) {
    throw new Error('Invalid selling unit for selected unit type.');
  }

  return product;
}

(user) {
  return user?.accountType === 'provider' &&
    user?.category === 'grocery-products' &&
    user?.status === 'active';
}

async function getProducts() {
  const stored = await readPersistentState(COLLECTION, dataFile, EMPTY_PRODUCTS);
  return Array.isArray(stored) ? stored : [];
}

async function mutateProducts(mutator) {
  return mutatePersistentState(COLLECTION, dataFile, EMPTY_PRODUCTS, async (stored) => {
    if (!Array.isArray(stored)) {
      throw new Error('Grocery inventory storage is invalid; refusing to overwrite existing data.');
    }
    return mutator(stored);
  });
}

function hasDuplicateSku(products, providerId, sku, exceptId = null) {
  if (!sku) return false;
  const normalized = sku.toLocaleLowerCase();
  return products.some((item) =>
    item.providerId === providerId &&
    item.id !== exceptId &&
    String(item.sku || '').trim().toLocaleLowerCase() === normalized
  );
}

export function registerGroceryRoutes(app, { requireAuth, broadcastEvent, getUsers, createGroceryOrderDeliveryJob, cancelGroceryOrderDeliveryJob }) {
  app.get('/api/grocery/products', async (req, res) => {
    try {
      const products = await getProducts();
      const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : null;
      const visible = products.filter((product) =>
        product.isAvailable === true &&
        product.stock > 0 &&
        (!providerId || product.providerId === providerId)
      );
      res.json({ products: visible });
    } catch (error) {
      console.error('Load grocery products error:', error);
      res.status(500).json({ error: 'Could not load grocery products.' });
    }
  });

  app.get('/api/grocery/products/mine', requireAuth, async (req, res) => {
    if (!isGroceryProvider(req.user)) {
      return res.status(403).json({ error: 'Only approved Grocery Products providers can manage inventory.' });
    }

    try {
      const products = await getProducts();
      res.json({ products: products.filter((product) => product.providerId === req.user.id) });
    } catch (error) {
      console.error('Load provider grocery inventory error:', error);
      res.status(500).json({ error: 'Could not load your grocery inventory.' });
    }
  });

  app.post('/api/grocery/products', requireAuth, async (req, res) => {
    if (!isGroceryProvider(req.user)) {
      return res.status(403).json({ error: 'Only approved Grocery Products providers can manage inventory.' });
    }

    let product;
    try {
      product = cleanProduct(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const item = await mutateProducts((products) => {
        if (hasDuplicateSku(products, req.user.id, product.sku)) {
          const error = new Error('A product with this SKU already exists in your inventory.');
          error.code = 'DUPLICATE_SKU';
          throw error;
        }

        const now = new Date().toISOString();
        const created = {
          ...product,
          id: `gprod-${crypto.randomUUID()}`,
          providerId: req.user.id,
          providerName: req.user.fullName,
          createdAt: now,
          updatedAt: now
        };
        products.unshift(created);
        return created;
      });

      return res.status(201).json({ product: item });
    } catch (error) {
      if (error.code === 'DUPLICATE_SKU') {
        return res.status(409).json({ error: error.message });
      }
      console.error('Create grocery product error:', error);
      return res.status(500).json({ error: 'Could not save product.' });
    }
  });

  app.put('/api/grocery/products/:id', requireAuth, async (req, res) => {
    if (!isGroceryProvider(req.user)) {
      return res.status(403).json({ error: 'Only approved Grocery Products providers can manage inventory.' });
    }

    let product;
    try {
      product = cleanProduct(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const outcome = await mutateProducts((products) => {
        const index = products.findIndex((item) =>
          item.id === req.params.id && item.providerId === req.user.id
        );
        if (index < 0) return { notFound: true };

        if (hasDuplicateSku(products, req.user.id, product.sku, req.params.id)) {
          const error = new Error('A product with this SKU already exists in your inventory.');
          error.code = 'DUPLICATE_SKU';
          throw error;
        }

        products[index] = { ...products[index], ...product, updatedAt: new Date().toISOString() };
        return { product: products[index] };
      });

      if (outcome.notFound) return res.status(404).json({ error: 'Product not found.' });
      return res.json({ product: outcome.product });
    } catch (error) {
      if (error.code === 'DUPLICATE_SKU') {
        return res.status(409).json({ error: error.message });
      }
      console.error('Update grocery product error:', error);
      return res.status(500).json({ error: 'Could not update product.' });
    }
  });

  app.delete('/api/grocery/products/:id', requireAuth, async (req, res) => {
    if (!isGroceryProvider(req.user)) {
      return res.status(403).json({ error: 'Only approved Grocery Products providers can manage inventory.' });
    }

    try {
      const outcome = await mutateProducts((products) => {
        const index = products.findIndex((item) =>
          item.id === req.params.id && item.providerId === req.user.id
        );
        if (index < 0) return { notFound: true };
        products.splice(index, 1);
        return { deleted: true };
      });

      if (outcome.notFound) return res.status(404).json({ error: 'Product not found.' });
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete grocery product error:', error);
      return res.status(500).json({ error: 'Could not delete product.' });
    }
  });

  app.post('/api/grocery/orders', requireAuth, async (req, res) => {
    if (req.user?.accountType !== 'customer' || req.user?.status !== 'active') return res.status(403).json({ error: 'An active customer account is required.' });
    const lines = Array.isArray(req.body?.items) ? req.body.items : [];
    const deliveryAddress = String(req.body?.deliveryAddress || '').trim().slice(0, 500);
    const phone = String(req.body?.phone || req.user.phone || '').trim().slice(0, 30);
    if (!lines.length || lines.length > 40 || !deliveryAddress || !phone) return res.status(400).json({ error: 'Add products, a delivery address and a contact number.' });
    const quantities = new Map();
    for (const line of lines) {
      const productId = String(line?.productId || '').trim(), quantity = Number(line?.quantity);
      if (!productId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return res.status(400).json({ error: 'Each cart item needs a valid product and whole-number quantity.' });
      quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }
    if ([...quantities.values()].some(quantity => quantity > 100)) return res.status(400).json({ error: 'Maximum quantity per product is 100.' });
    let reserved = [];
    try {
      let order = await mutateProducts(products => {
        const selected = [...quantities].map(([productId, quantity]) => {
          const product = products.find(item => item.id === productId && item.isAvailable === true);
          if (!product) throw new Error('A product is no longer available. Refresh your cart.');
          if (product.stock < quantity) throw new Error('Not enough stock for ' + product.name + '. Available: ' + product.stock + '.');
          return { product, quantity };
        });
        const providerIds = [...new Set(selected.map(item => item.product.providerId))];
        if (providerIds.length !== 1) throw new Error('Please place separate orders for products from different shops.');
        const items = selected.map(({ product, quantity }) => ({ productId: product.id, name: product.name, brand: product.brand, category: product.category, unit: product.unit, packSize: product.packSize, quantity, unitPrice: product.price, lineTotal: Number((product.price * quantity).toFixed(2)) }));
        const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
        selected.forEach(({ product, quantity }) => { product.stock -= quantity; product.updatedAt = new Date().toISOString(); reserved.push({ productId: product.id, quantity }); });
        return { id: 'gord-' + crypto.randomUUID(), customerId: req.user.id, customerName: req.user.fullName, customerPhone: phone, providerId: providerIds[0], providerName: selected[0].product.providerName, items, subtotal: total, deliveryFee: 0, total, currency: 'LKR', deliveryAddress, notes: String(req.body?.notes || '').trim().slice(0, 500), paymentMethod: 'cash_on_delivery', paymentStatus: 'unpaid', status: 'pending', statusHistory: [{ status: 'pending', at: new Date().toISOString(), by: req.user.id }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deliveryStatus: 'pending_dispatch', destinationLat: Number.isFinite(Number(req.body?.destinationLat)) ? Number(req.body.destinationLat) : null, destinationLng: Number.isFinite(Number(req.body?.destinationLng)) ? Number(req.body.destinationLng) : null };
      });
      await mutatePersistentState('grocery_orders', ordersFile, EMPTY_ORDERS, stored => { if (!Array.isArray(stored)) throw new Error('Grocery order storage is invalid.'); stored.unshift(order); return true; });
      try {
        const users = await getUsers();
        const provider = users.find(user => user.id === order.providerId && user.accountType === 'provider' && user.status === 'active');
        const dispatch = await createGroceryOrderDeliveryJob(order, provider);
        if (dispatch.available) {
          order = await mutatePersistentState('grocery_orders', ordersFile, EMPTY_ORDERS, stored => {
            const saved = stored.find(item => item.id === order.id);
            if (!saved) return order;
            saved.deliveryJobId = dispatch.job.id;
            saved.deliveryStatus = 'driver_requested';
            saved.deliveryPickupPin = dispatch.pickupPin;
            saved.deliveryPin = dispatch.deliveryPin;
            saved.updatedAt = new Date().toISOString();
            return saved;
          });
          broadcastEvent('driver:job_created', { job: dispatch.job, customerId: order.customerId, driverId: null });
        } else {
          order = await mutatePersistentState('grocery_orders', ordersFile, EMPTY_ORDERS, stored => {
            const saved = stored.find(item => item.id === order.id);
            if (!saved) return order;
            saved.deliveryStatus = dispatch.reason === 'provider_address_missing' ? 'shop_address_required' : 'dispatch_unavailable';
            saved.updatedAt = new Date().toISOString();
            return saved;
          });
        }
      } catch (dispatchError) {
        console.error('Grocery delivery dispatch failed:', dispatchError);
        order.deliveryStatus = 'dispatch_unavailable';
      }
      broadcastEvent('grocery:order_created', { orderId: order.id, providerId: order.providerId, customerId: order.customerId });
      return res.status(201).json({ order, message: order.deliveryStatus === 'driver_requested' ? 'Order placed and delivery driver requested. Pay cash on delivery.' : 'Order placed. The shop must confirm its pickup address before a driver can be requested. Pay cash on delivery.' });
    } catch (error) {
      if (reserved.length) {
        try { await mutateProducts(products => { for (const line of reserved) { const product = products.find(item => item.id === line.productId); if (product) { product.stock += line.quantity; product.updatedAt = new Date().toISOString(); } } return true; }); }
        catch (restoreError) { console.error('Grocery stock compensation failed:', restoreError); }
      }
      return res.status(409).json({ error: error.message || 'Could not place grocery order.' });
    }
  });
  app.get('/api/grocery/orders/mine', requireAuth, async (req, res) => {
    if (req.user?.accountType !== 'customer') return res.status(403).json({ error: 'Customer account required.' });
    const orders = await readPersistentState('grocery_orders', ordersFile, EMPTY_ORDERS);
    return res.json({ orders: orders.filter(order => order.customerId === req.user.id) });
  });
  app.get('/api/grocery/orders/provider', requireAuth, async (req, res) => {
    if (!isGroceryProvider(req.user)) return res.status(403).json({ error: 'Approved Grocery Products provider required.' });
    const orders = await readPersistentState('grocery_orders', ordersFile, EMPTY_ORDERS);
    return res.json({ orders: orders.filter(order => order.providerId === req.user.id).map(({ deliveryPickupPin, deliveryPin, ...order }) => order) });
  });
  app.get('/api/grocery/orders/admin', requireAuth, async (req, res) => {
    if (req.user?.accountType !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    const orders = await readPersistentState('grocery_orders', ordersFile, EMPTY_ORDERS);
    return res.json({ orders: orders.map(({ deliveryPickupPin, deliveryPin, ...order }) => order) });
  });
  app.patch('/api/grocery/orders/:id/status', requireAuth, async (req, res) => {
    const next = String(req.body?.status || '');
    if (!['accepted', 'preparing', 'ready_for_pickup', 'cancelled'].includes(next)) return res.status(400).json({ error: 'Invalid grocery order status.' });
    const isAdmin = req.user?.accountType === 'admin', isProvider = isGroceryProvider(req.user);
    if (!isAdmin && !isProvider) return res.status(403).json({ error: 'Shop provider or Admin access required.' });
    if (next === 'cancelled') {
      const existing = await readPersistentState('grocery_orders', ordersFile, EMPTY_ORDERS);
      const target = existing.find(item => item.id === req.params.id && (isAdmin || item.providerId === req.user.id));
      if (!target) return res.status(404).json({ error: 'Order not found.' });
      if (target.deliveryJobId && !(await cancelGroceryOrderDeliveryJob(target.deliveryJobId))) {
        return res.status(409).json({ error: 'A delivery driver has already accepted this order. Contact ARY support before cancelling.' });
      }
    }
    const result = await mutatePersistentState('grocery_orders', ordersFile, EMPTY_ORDERS, stored => {
      const order = stored.find(item => item.id === req.params.id && (isAdmin || item.providerId === req.user.id));
      if (!order) return { missing: true };
      const transitions = { pending: ['accepted', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['ready_for_pickup'], ready_for_pickup: [] };
      if (!transitions[order.status]?.includes(next)) return { invalid: true };
      order.status = next; if (next === 'cancelled') order.deliveryStatus = 'cancelled'; order.updatedAt = new Date().toISOString(); order.statusHistory.push({ status: next, at: order.updatedAt, by: req.user.id });
      return { order };
    });
    if (result.missing) return res.status(404).json({ error: 'Order not found.' });
    if (result.invalid) return res.status(409).json({ error: 'That order status transition is not allowed.' });
    if (next === 'cancelled') await mutateProducts(products => { for (const line of result.order.items) { const product = products.find(item => item.id === line.productId); if (product) { product.stock += line.quantity; product.updatedAt = new Date().toISOString(); } } return true; });
    broadcastEvent('grocery:order_updated', { orderId: result.order.id, providerId: result.order.providerId, customerId: result.order.customerId, status: result.order.status });
    return res.json({ order: result.order });
  });


}
