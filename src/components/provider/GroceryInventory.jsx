import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Plus,
  Package,
  Search,
  Pencil,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Archive,
  RefreshCw
} from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button, Modal, EmptyState, Skeleton, ConfirmDialog, SegmentedControl } from '../../design-system';

const UNIT_GROUPS = {
  weight: [
    { value: 'g', label: 'Gram (g)' },
    { value: 'kg', label: 'Kilogram (kg)' }
  ],
  volume: [
    { value: 'ml', label: 'Millilitre (ml)' },
    { value: 'L', label: 'Litre (L)' }
  ],
  count: [
    { value: 'piece', label: 'Piece / Count' },
    { value: 'egg_tray', label: 'Tray' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'pack', label: 'Pack' },
    { value: 'box', label: 'Box' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'can', label: 'Can' },
    { value: 'sachet', label: 'Sachet' }
  ],
  length: [
    { value: 'cm', label: 'Centimetre (cm)' },
    { value: 'm', label: 'Metre (m)' }
  ],
  area: [
    { value: 'sqft', label: 'Square foot (sq ft)' }
  ],
  gas: [
    { value: 'kg_cylinder', label: 'Gas cylinder (kg)' }
  ]
};

const CATEGORIES = [
  'Rice & Grains',
  'Flour & Baking',
  'Dhal, Pulses & Beans',
  'Sugar, Salt & Spices',
  'Cooking Oil & Ghee',
  'Milk & Dairy',
  'Eggs',
  'Beverages & Water',
  'Canned & Packaged Food',
  'Snacks & Biscuits',
  'Fresh Vegetables',
  'Fresh Fruits',
  'Meat & Seafood',
  'Bread & Bakery',
  'Personal Care',
  'Laundry & Cleaning',
  'Household Essentials',
  'Gas Cylinders',
  'Baby Products',
  'Pet Supplies',
  'Other'
];

const BLANK_FORM = {
  name: '',
  category: 'Rice & Grains',
  brand: '',
  unitGroup: 'weight',
  unit: 'kg',
  packSize: '1',
  price: '',
  stock: '',
  lowStock: '5',
  sku: '',
  description: '',
  isAvailable: true
};

export default function GroceryInventory() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogChoice, setCatalogChoice] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'low_stock' | 'available'
  const [categoryFilter, setCategoryFilter] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const units = UNIT_GROUPS[form.unitGroup] || UNIT_GROUPS.count;
  const selectedCatalogSizes = useMemo(() => {
    if (!catalogChoice) return [];
    const [catalogIndex] = catalogChoice.split(':').map(Number);
    return Array.isArray(catalog[catalogIndex]?.sizes) ? catalog[catalogIndex].sizes : [];
  }, [catalog, catalogChoice]);

  const load = useCallback(async () => {
    if (!currentUser?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grocery/products/mine`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load store inventory');
      setItems(data.products || []);
    } catch (e) {
      setError(e.message || 'Error loading inventory');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    load();
    fetch(`${API_BASE}/grocery/catalog`).then(res => res.json()).then(data => setCatalog(Array.isArray(data.catalog) ? data.catalog : [])).catch(() => setCatalog([]));
  }, [load]);

  function applyCatalogTemplate(value) {
    setCatalogChoice(value);
    const [catalogIndex, productIndex] = value.split(':').map(Number);
    const template = catalog[catalogIndex];
    const productName = template?.products?.[productIndex];
    if (!template || !productName) return;
    const defaultSize = template.sizes?.[0] ?? 1;
    setForm(prev => ({ ...prev, name: productName, category: template.category, unitGroup: template.unitGroup, unit: template.unit, packSize: String(defaultSize) }));
  }

  function handleFieldChange(field, value) {
    if (field === 'packSize' && value === 'custom') {
      setForm(prev => ({ ...prev, packSize: '' }));
      return;
    }
    setForm(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'unitGroup' ? { unit: (UNIT_GROUPS[value] || UNIT_GROUPS.count)[0].value } : {})
    }));
  }

  function openAddSheet() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setError('');
    setIsSheetOpen(true);
  }

  function openEditSheet(item) {
    setEditingId(item.id);
    setForm({
      ...BLANK_FORM,
      ...item,
      price: String(item.price),
      stock: String(item.stock),
      lowStock: String(item.lowStock ?? 5),
      packSize: String(item.packSize ?? 1)
    });
    setError('');
    setIsSheetOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        lowStock: Number(form.lowStock),
        packSize: Number(form.packSize)
      };

      const url = `${API_BASE}/grocery/products${editingId ? `/${editingId}` : ''}`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save product');

      setIsSheetOpen(false);
      setEditingId(null);
      setForm(BLANK_FORM);
      await load();
    } catch (e) {
      setError(e.message || 'Could not save product');
    } finally {
      setSaving(false);
    }
  }

  async function executeDelete(id) {
    try {
      const res = await fetch(`${API_BASE}/grocery/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete product');
      setItems(old => old.filter(x => x.id !== id));
      setConfirmDeleteId(null);
    } catch (e) {
      setError(e.message || 'Could not delete product');
    }
  }

  // Quick inline stock adjustment
  async function adjustStock(item, delta) {
    const newStock = Math.max(0, Number(item.stock) + delta);
    try {
      const res = await fetch(`${API_BASE}/grocery/products/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ ...item, stock: newStock })
      });
      if (res.ok) {
        setItems(old => old.map(x => x.id === item.id ? { ...x, stock: newStock } : x));
      }
    } catch (e) {
      console.warn('Could not update stock:', e);
    }
  }

  // Filtering
  const filtered = useMemo(() => {
    return items.filter(x => {
      const matchesQuery = (x.name + ' ' + x.category + ' ' + (x.brand || '') + ' ' + (x.sku || ''))
        .toLowerCase()
        .includes(query.toLowerCase());
      if (!matchesQuery) return false;

      if (categoryFilter && x.category !== categoryFilter) return false;

      if (filterMode === 'low_stock') {
        return Number(x.stock) <= Number(x.lowStock ?? 5);
      }
      if (filterMode === 'available') {
        return Boolean(x.isAvailable);
      }
      return true;
    });
  }, [items, query, categoryFilter, filterMode]);

  const lowStockCount = items.filter(x => Number(x.stock) <= Number(x.lowStock ?? 5)).length;

  return (
    <div className="grocery-inventory-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Toolbar & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary, #f8fafc)' }}>
            Grocery & Retail Inventory
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-500, #64748b)' }}>
            Manage product pricing, stock counts, pack sizes, and low-inventory warnings
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={openAddSheet}>
            <Plus size={16} /> Add Product
          </Button>
          <Button variant="ghost" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2. Inventory Stats Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <Card style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md, 8px)', background: 'var(--color-brand-50, #edf7f2)', color: 'var(--color-brand-600, #174d3d)', display: 'grid', placeItems: 'center' }}>
            <Package size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', lineHeight: 1 }}>
              {items.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>Total Catalog SKUs</span>
          </div>
        </Card>

        <Card style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md, 8px)', background: 'var(--color-warning-50, #fffbeb)', color: 'var(--color-warning-600, #d97706)', display: 'grid', placeItems: 'center' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning-700, #b45309)', lineHeight: 1 }}>
              {lowStockCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>Low Stock Warnings</span>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="inventory-toolbar">
        <div className="inventory-search-wrap">
          <Search size={16} color="var(--color-neutral-400, #94a3b8)" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, brands, or barcode SKU..."
            className="inventory-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SegmentedControl
            options={[
              { value: 'all', label: `All (${items.length})` },
              { value: 'low_stock', label: `Low Stock (${lowStockCount})` },
              { value: 'available', label: 'Active Only' }
            ]}
            value={filterMode}
            onChange={setFilterMode}
          />

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-border, #cbd5e1)',
              borderRadius: 'var(--radius-md, 8px)',
              background: '#fff',
              fontSize: '14px',
              color: 'var(--color-neutral-700, #334155)'
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* 4. Products Display: Responsive Table & Mobile Cards */}
      {loading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <Skeleton height="70px" radius="8px" />
          <Skeleton height="70px" radius="8px" />
          <Skeleton height="70px" radius="8px" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No grocery products found"
          description={query ? "No items match your search filters." : "Add your first retail grocery or food product to start accepting customer orders."}
          actionLabel={query ? "Clear Filters" : "Add Product"}
          onAction={query ? () => { setQuery(''); setCategoryFilter(''); setFilterMode('all'); } : openAddSheet}
        />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {/* Mobile Card Grid (below 768px) */}
          <div className="inventory-card-grid">
            {filtered.map(item => {
              const isLow = Number(item.stock) <= Number(item.lowStock ?? 5);

              return (
                <Card
                  key={item.id}
                  className={`inventory-product-card ${isLow ? 'low-stock' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <b style={{ fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                        {item.name}
                      </b>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                        {item.brand ? `${item.brand} · ` : ''}{item.category}
                      </div>
                    </div>

                    <Badge variant={item.isAvailable ? 'success' : 'neutral'} dot={false}>
                      {item.isAvailable ? 'Available' : 'Hidden'}
                    </Badge>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-brand-800, #174d3d)' }}>
                      LKR {Number(item.price).toLocaleString('en-LK')}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
                      Pack: <b>{item.packSize} {item.unit === 'kg_cylinder' ? 'kg cylinder' : item.unit}</b>
                    </span>
                  </div>

                  {/* Stock Stepper & Low Stock Alert */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'var(--color-surface-subtle, #f8faf8)',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--color-border-subtle, #e5ebe2)',
                    marginTop: 6
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', display: 'block' }}>
                        In Stock:
                      </span>
                      <b style={{ fontSize: '0.92rem', color: isLow ? 'var(--color-warning-700, #b45309)' : 'inherit' }}>
                        {item.stock} packs
                      </b>
                    </div>

                    <div className="stock-stepper-wrap">
                      <button
                        type="button"
                        className="stock-stepper-btn"
                        onClick={() => adjustStock(item, -1)}
                        aria-label="Decrease stock"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="stock-stepper-btn"
                        onClick={() => adjustStock(item, 1)}
                        aria-label="Increase stock"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {isLow && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-warning-800, #92400e)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={12} color="#d97706" />
                      Low inventory! Threshold is {item.lowStock ?? 5} units.
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-subtle, #edf2ee)' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditSheet(item)}
                    >
                      <Pencil size={13} /> Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDeleteId(item.id)}
                    >
                      <Trash2 size={13} /> Remove
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Add / Edit Product BottomSheet */}
      <Modal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingId ? 'Edit Product Details' : 'Add New Grocery Product'}
        isBottomSheet={true}
      >
        <form onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {!editingId && catalog.length > 0 && <div className="provider-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="provider-form-label">Quick Product Catalogue (Sri Lanka)</label>
              <select value={catalogChoice} onChange={e => applyCatalogTemplate(e.target.value)} className="provider-form-select">
                <option value="">Choose a product template…</option>
                {catalog.map((group, gi) => <optgroup key={group.category} label={group.category}>
                  {(group.products || []).map((product, pi) => <option key={`${gi}:${pi}`} value={`${gi}:${pi}`}>{product}</option>)}
                </optgroup>)}
              </select>
              <small style={{ color: 'var(--color-neutral-500, #64748b)' }}>Selecting a template fills product name, category, unit and pack size. Set your own price and stock.</small>
            </div>}
            <div className="provider-form-group">
              <label className="provider-form-label">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder="e.g. Keeri Samba Rice"
                className="provider-form-input"
              />
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Category *</label>
              <select
                value={form.category}
                onChange={e => handleFieldChange('category', e.target.value)}
                className="provider-form-select"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Brand</label>
              <input
                value={form.brand}
                onChange={e => handleFieldChange('brand', e.target.value)}
                placeholder="e.g. Prima / Arpico / Munchee"
                className="provider-form-input"
              />
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Unit Type *</label>
              <select
                value={form.unitGroup}
                onChange={e => handleFieldChange('unitGroup', e.target.value)}
                className="provider-form-select"
              >
                <option value="weight">Weight (g, kg)</option>
                <option value="volume">Volume (ml, L)</option>
                <option value="count">Count / Pack (Piece, Box, Tray)</option>
                <option value="length">Length (cm, m)</option>
                <option value="area">Area (sqft)</option>
                <option value="gas">Gas Cylinder (kg)</option>
              </select>
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Selling Unit *</label>
              <select
                value={form.unit}
                onChange={e => handleFieldChange('unit', e.target.value)}
                className="provider-form-select"
              >
                {units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Pack / Item Size *</label>
              {selectedCatalogSizes.length > 0 ? (
                <select
                  required
                  value={form.packSize}
                  onChange={e => handleFieldChange('packSize', e.target.value)}
                  className="provider-form-select"
                >
                  {selectedCatalogSizes.map(size => <option key={size} value={String(size)}>{size} {form.unit}</option>)}
                  <option value="custom">Custom size…</option>
                </select>
              ) : (
                <input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.packSize}
                  onChange={e => handleFieldChange('packSize', e.target.value)}
                  className="provider-form-input"
                />
              )}
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Price (LKR) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 350"
                value={form.price}
                onChange={e => handleFieldChange('price', e.target.value)}
                className="provider-form-input"
              />
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Initial Stock Quantity *</label>
              <input
                required
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 50"
                value={form.stock}
                onChange={e => handleFieldChange('stock', e.target.value)}
                className="provider-form-input"
              />
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">Low Stock Alert Level</label>
              <input
                type="number"
                min="0"
                value={form.lowStock}
                onChange={e => handleFieldChange('lowStock', e.target.value)}
                className="provider-form-input"
              />
            </div>

            <div className="provider-form-group">
              <label className="provider-form-label">SKU / Barcode (Optional)</label>
              <input
                value={form.sku}
                onChange={e => handleFieldChange('sku', e.target.value)}
                placeholder="e.g. 4791234567890"
                className="provider-form-input"
              />
            </div>
          </div>

          <div className="provider-form-group">
            <label className="provider-form-label">Description & Usage Notes (Optional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              placeholder="Provide details such as expiry dates, origin, or usage notes."
              className="provider-form-textarea"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={e => handleFieldChange('isAvailable', e.target.checked)}
            />
            <b>Immediately active & visible to customers</b>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              <Save size={15} /> {saving ? 'Saving...' : editingId ? 'Update Product' : 'Add to Catalog'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSheetOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Remove Product from Shop?"
        message="This product will be removed from your catalog and will no longer be visible to customers. Existing past order history will be preserved."
        confirmLabel="Remove Product"
        cancelLabel="Keep Product"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) executeDelete(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
