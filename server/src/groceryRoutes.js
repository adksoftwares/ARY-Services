import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutatePersistentState, readPersistentState } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, '..', 'data', 'grocery-products.json');
const COLLECTION = 'grocery_products';
const EMPTY_PRODUCTS = [];

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

function isGroceryProvider(user) {
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

export function registerGroceryRoutes(app, { requireAuth }) {
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
}
