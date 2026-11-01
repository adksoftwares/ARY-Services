import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutatePersistentState, readPersistentState } from './storage.js';
import { broadcastEvent } from './eventHub.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const stateFile = path.join(here, '..', 'data', 'grocery-marketplace.json');
const initialState = { products: [], orders: [] };
const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const text = (value, max = 160) => String(value ?? '').trim().slice(0, max);

function cleanProduct(body = {}) {
  const product = {
    name: text(body.name, 120), category: text(body.category || 'Other', 80),
    brand: text(body.brand, 80), unitGroup: text(body.unitGroup || 'count', 20),
    unit: text(body.unit || 'piece', 20), packSize: Number(body.packSize),
    price: Number(body.price), stock: Number(body.stock),
    lowStock: Number(body.lowStock ?? 5), sku: text(body.sku, 80),
    description: text(body.description, 500), isAvailable: body.isAvailable !== false
  };
  const units = {
    weight: ['g', 'kg'], volume: ['ml', 'L'],
    count: ['piece', 'egg_tray', 'dozen', 'pack', 'box', 'bottle', 'can', 'sachet'],
    length: ['cm', 'm'], area: ['sqft'], gas: ['kg_cylinder']
  };
  if (!product.name || !Number.isFinite(product.packSize) || product.packSize <= 0 ||
      !Number.isFinite(product.price) || product.price < 0 ||
      !Number.isInteger(product.stock) || product.stock < 0 ||
      !Number.isFinite(product.lowStock) || product.lowStock < 0) {
    throw new Error('Enter a valid product name, pack size, price and stock quantity.');
  }
  if (!units[product.unitGroup]?.includes(product.unit)) throw new Error('Invalid selling unit for selected unit type.');
  return product;
}

function customerOnly(req, res) {
  if (req.user?.accountType !== 'customer' || req.user?.status !== 'active') {
    res.status(403).json({ error: 'An active customer account is required.' });
    return false;
  }
  return true;
}
function providerOnly(req, res) {
  if (req.user?.accountType !== 'provider' || req.user?.category !== 'grocery-products' || req.user?.status !== 'active') {
    res.status(403).json({ error: 'Only approved Grocery Products providers can manage this shop.' });
    return false;
  }
  return true;
}

export function registerGroceryRoutes(app, { requireAuth }) {
  app.get('/api/grocery/products', async (req, res) => {
    try {
      const state = await readPersistentState('grocery_marketplace', stateFile, initialState);
      const providerId = text(req.query.providerId, 100);
      res.json({ products: state.products.filter(p => p.isAvailable && p.stock > 0 && (!providerId || p.providerId === providerId)) });
    } catch {
      res.status(500).json({ error: 'Could not load grocery products.' });
    }
  });

  app.get('/api/grocery/products/mine', requireAuth, async (req, res) => {
    if (!providerOnly(req, res)) return;
    const state = await readPersistentState('grocery_marketplace', stateFile, initialState);
    res.json({ products: state.products.filter(p => p.providerId === req.user.id) });
  });

  app.post('/api/grocery/products', requireAuth, async (req, res) => {
    if (!providerOnly(req, res)) return;
    let product;
    try { product = cleanProduct(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
    try {
      const created = await mutatePersistentState('grocery_marketplace', stateFile, initialState, state => {
        const item = { ...product, id: id('gprod'), providerId: req.user.id, providerName: req.user.fullName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.products.unshift(item);
        return item;
      });
      res.status(201).json({ product: created });
    } catch { res.status(500).json({ error: 'Could not save product.' }); }
  });

  app.put('/api/grocery/products/:id', requireAuth, async (req, res) => {
    if (!providerOnly(req, res)) return;
    let product;
    try { product = cleanProduct(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
    try {
      const updated = await mutatePersistentState('grocery_marketplace', stateFile, initialState, state => {
        const item = state.products.find(p => p.id === req.params.id && p.providerId === req.user.id);
        if (!item) return null;
        Object.assign(item, product, { updatedAt: new Date().toISOString() });
        return item;
      });
      if (!updated) return res.status(404).json({ error: 'Product not found.' });
      res.json({ product: updated });
    } catch { res.status(500).json({ error: 'Could not update product.' }); }
  });

  app.delete('/api/grocery/products/:id', requireAuth, async (req, res) => {
    if (!providerOnly(req, res)) return;
    try {
      const removed = await mutatePersistentState('grocery_marketplace', stateFile, initialState, state => {
        const index = state.products.findIndex(p => p.id === req.params.id && p.providerId === req.user.id);
        if (index < 0) return false;
        state.products.splice(index, 1);
        return true;
      });
      if (!removed) return res.status(404).json({ error: 'Product not found.' });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Could not delete product.' }); }
  });

  // Cash on delivery is the only enabled payment option. Stock is reserved atomically.
  app.post('/api/grocery/orders', requireAuth, async (req, res) => {
    if (!customerOnly(req, res)) return;
    const lines = Array.isArray(req.body?.items) ? req.body.items : [];
    const deliveryAddress = text(req.body?.deliveryAddress, 500);
    const phone = text(req.body?.phone || req.user.phone, 30);
    if (!lines.length || lines.length > 40 || !deliveryAddress || !phone) {
      return res.status(400).json({ error: 'Add products, a delivery address and a contact number.' });
    }
    const quantities = new Map();
    for (const line of lines) {
      const productId = text(line?.productId, 120);
      const quantity = Number(line?.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({ error: 'Each cart item must have a valid product and whole-number quantity.' });
      }
      quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }
    try {
      const outcome = await mutatePersistentState('grocery_marketplace', stateFile, initialState, state => {
        const selected = [...quantities].map(([productId, quantity]) => {
          const product = state.products.find(p => p.id === productId && p.isAvailable);
          if (!product) throw new Error('One or more products are no longer available. Refresh your cart.');
          if (product.stock < quantity) throw new Error(`Not enough stock for ${product.name}. Available: ${product.stock}.`);
          return { product, quantity };
        });
        const providerIds = [...new Set(selected.map(x => x.product.providerId))];
        if (providerIds.length !== 1) throw new Error('Please place separate orders for products from different shops.');
        const items = selected.map(({ product, quantity }) => ({
          productId: product.id, name: product.name, brand: product.brand,
          category: product.category, unit: product.unit, packSize: product.packSize,
          quantity, unitPrice: product.price, lineTotal: Number((product.price * quantity).toFixed(2))
        }));
        const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
        selected.forEach(({ product, quantity }) => { product.stock -= quantity; product.updatedAt = new Date().toISOString(); });
        const order = {
          id: id('gord'), customerId: req.user.id, customerName: req.user.fullName,
          customerPhone: phone, providerId: providerIds[0], providerName: selected[0].product.providerName,
          items, subtotal: total, deliveryFee: 0, total, currency: 'LKR',
          deliveryAddress, notes: text(req.body?.notes, 500),
          paymentMethod: 'cash_on_delivery', paymentStatus: 'unpaid',
          status: 'pending', statusHistory: [{ status: 'pending', at: new Date().toISOString(), by: req.user.id }],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        state.orders.unshift(order);
        return order;
      });
      broadcastEvent('grocery:order_created', { orderId: outcome.id, providerId: outcome.providerId });
      res.status(201).json({ order: outcome, message: 'Order placed. Pay cash to the delivery person on arrival.' });
    } catch (error) {
      res.status(409).json({ error: error.message || 'Could not place this order.' });
    }
  });

  app.get('/api/grocery/orders/mine', requireAuth, async (req, res) => {
    if (!customerOnly(req, res)) return;
    const state = await readPersistentState('grocery_marketplace', stateFile, initialState);
    res.json({ orders: state.orders.filter(o => o.customerId === req.user.id) });
  });

  app.get('/api/grocery/orders/provider', requireAuth, async (req, res) => {
    if (!providerOnly(req, res)) return;
    const state = await readPersistentState('grocery_marketplace', stateFile, initialState);
    res.json({ orders: state.orders.filter(o => o.providerId === req.user.id) });
  });

  app.get('/api/grocery/orders/admin', requireAuth, async (req, res) => {
    if (req.user?.accountType !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    const state = await readPersistentState('grocery_marketplace', stateFile, initialState);
    res.json({ orders: state.orders });
  });

  app.patch('/api/grocery/orders/:id/status', requireAuth, async (req, res) => {
    const next = text(req.body?.status, 30);
    const allowed = ['accepted', 'preparing', 'ready_for_pickup', 'cancelled'];
    if (!allowed.includes(next)) return res.status(400).json({ error: 'Invalid grocery order status.' });
    const isAdmin = req.user?.accountType === 'admin';
    const isProvider = req.user?.accountType === 'provider' && req.user?.category === 'grocery-products' && req.user?.status === 'active';
    if (!isAdmin && !isProvider) return res.status(403).json({ error: 'Shop provider or Admin access required.' });
    try {
      const result = await mutatePersistentState('grocery_marketplace', stateFile, initialState, state => {
        const order = state.orders.find(o => o.id === req.params.id && (isAdmin || o.providerId === req.user.id));
        if (!order) return { missing: true };
        const transitions = { pending: ['accepted', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['ready_for_pickup'], ready_for_pickup: [] };
        if (!transitions[order.status]?.includes(next)) return { invalid: true };
        if (next === 'cancelled') {
          for (const line of order.items) {
            const product = state.products.find(p => p.id === line.productId);
            if (product) product.stock += line.quantity;
          }
        }
        order.status = next;
        order.updatedAt = new Date().toISOString();
        order.statusHistory.push({ status: next, at: order.updatedAt, by: req.user.id });
        return { order };
      });
      if (result.missing) return res.status(404).json({ error: 'Order not found.' });
      if (result.invalid) return res.status(409).json({ error: 'That order status transition is not allowed.' });
      broadcastEvent('grocery:order_updated', { orderId: result.order.id, providerId: result.order.providerId, status: result.order.status });
      res.json({ order: result.order });
    } catch { res.status(500).json({ error: 'Could not update order status.' }); }
  });
}
