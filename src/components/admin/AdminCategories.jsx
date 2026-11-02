import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Wrench,
  Zap,
  ShoppingBag,
  Utensils,
  Car,
  Package,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Card, Badge, Button, Modal, ConfirmDialog } from '../../design-system';

const ICON_MAP = {
  wrench: Wrench,
  zap: Zap,
  'shopping-bag': ShoppingBag,
  utensils: Utensils,
  car: Car,
  package: Package,
  sparkles: Sparkles,
  layers: Layers
};

export default function AdminCategories({
  services = [],
  setServices,
  onNotice
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [nameSi, setNameSi] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [basePriceHint, setBasePriceHint] = useState('1500');
  const [iconName, setIconName] = useState('layers');
  const [color, setColor] = useState('peach');
  const [isActive, setIsActive] = useState(true);

  function openAddModal() {
    setEditingCategory(null);
    setName('');
    setNameSi('');
    setNameTa('');
    setSlug('');
    setDescription('');
    setBasePriceHint('1500');
    setIconName('layers');
    setColor('peach');
    setIsActive(true);
    setValidationError('');
    setModalOpen(true);
  }

  function openEditModal(cat) {
    setEditingCategory(cat);
    setName(cat.name || '');
    setNameSi(cat.nameSi || '');
    setNameTa(cat.nameTa || '');
    setSlug(cat.slug || '');
    setDescription(cat.description || '');
    setBasePriceHint(String(cat.basePriceHint || '1500'));
    setIconName(cat.iconName || 'layers');
    setColor(cat.color || 'peach');
    setIsActive(cat.isActive !== false);
    setValidationError('');
    setModalOpen(true);
  }

  function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Category name is required.');
      return;
    }

    const cleanSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (editingCategory) {
      setServices(prev =>
        prev.map(c =>
          c.id === editingCategory.id
            ? {
                ...c,
                name: name.trim(),
                nameSi: nameSi.trim() || name.trim(),
                nameTa: nameTa.trim() || name.trim(),
                slug: cleanSlug,
                description: description.trim(),
                basePriceHint: parseInt(basePriceHint, 10) || 1500,
                iconName,
                color,
                isActive
              }
            : c
        )
      );
      onNotice?.(`Category "${name.trim()}" updated successfully.`);
    } else {
      const newCat = {
        id: Date.now(),
        name: name.trim(),
        nameSi: nameSi.trim() || name.trim(),
        nameTa: nameTa.trim() || name.trim(),
        slug: cleanSlug,
        description: description.trim() || 'Professional marketplace service category',
        basePriceHint: parseInt(basePriceHint, 10) || 1500,
        iconName,
        color,
        isActive
      };
      setServices(prev => [...prev, newCat]);
      onNotice?.(`Category "${newCat.name}" created successfully.`);
    }

    setModalOpen(false);
  }

  function handleToggleActive(id) {
    setServices(prev =>
      prev.map(c => (c.id === id ? { ...c, isActive: c.isActive === false ? true : false } : c))
    );
    onNotice?.('Category visibility updated.');
  }

  function handleDeleteConfirm() {
    if (services.length <= 1) {
      onNotice?.('Validation notice: At least one service category must remain active.');
      setDeleteConfirmCat(null);
      return;
    }
    setServices(prev => prev.filter(c => c.id !== deleteConfirmCat.id));
    onNotice?.(`Category "${deleteConfirmCat.name}" removed.`);
    setDeleteConfirmCat(null);
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header Card */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers size={22} color="var(--color-brand-600, #174d3d)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-900, #173b2f)' }}>
                Marketplace Service Categories ({services.length})
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Manage customer search verticals, multi-language naming (English, Sinhala, Tamil), and baseline pricing hints.
            </p>
          </div>

          <Button variant="primary" size="sm" onClick={openAddModal}>
            <Plus size={15} /> Add New Category
          </Button>
        </div>
      </Card>

      {/* 2. Categories Table */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Category Name (EN)</th>
                <th style={{ width: '20%' }}>Sinhala / Tamil Localization</th>
                <th style={{ width: '15%' }}>Slug & Icon</th>
                <th style={{ width: '15%' }}>Base Price Hint</th>
                <th style={{ width: '12%' }}>Visibility</th>
                <th style={{ textAlign: 'right', width: '16%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(cat => {
                const IconComponent = ICON_MAP[cat.iconName] || Layers;
                const active = cat.isActive !== false;

                return (
                  <tr key={cat.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'var(--color-brand-50, #edf7f2)',
                          color: 'var(--color-brand-700, #174d3d)',
                          display: 'grid',
                          placeItems: 'center'
                        }}>
                          <IconComponent size={16} />
                        </div>
                        <div>
                          <b style={{ color: 'var(--color-text, #0f172a)', fontSize: '0.9rem' }}>{cat.name}</b>
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-neutral-400, #94a3b8)' }}>{cat.description}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text, #1e293b)' }}>
                        SI: <b>{cat.nameSi || '—'}</b>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                        TA: <b>{cat.nameTa || '—'}</b>
                      </div>
                    </td>

                    <td>
                      <code style={{ fontSize: '0.78rem', background: 'var(--color-neutral-100, #f1f5f9)', padding: '2px 6px', borderRadius: 4 }}>
                        /{cat.slug}
                      </code>
                    </td>

                    <td>
                      <b style={{ color: 'var(--color-brand-700, #174d3d)', fontSize: '0.88rem' }}>
                        LKR {Number(cat.basePriceHint || 1500).toLocaleString()}
                      </b>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Badge variant={active ? 'success' : 'neutral'} dot={true}>
                          {active ? 'ACTIVE' : 'HIDDEN'}
                        </Badge>
                      </button>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(cat)}
                          title="Edit Category"
                          aria-label={`Edit ${cat.name}`}
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteConfirmCat(cat)}
                          title="Delete Category"
                          aria-label={`Delete ${cat.name}`}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create Marketplace Service Category'}
        maxWidth="540px"
      >
        <form onSubmit={handleSave} style={{ padding: '4px 0', display: 'grid', gap: 14 }}>
          {validationError && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: '0.82rem' }}>
              {validationError}
            </div>
          )}

          {/* Multilingual Names */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                Category Name (English) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug && !editingCategory) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }
                }}
                placeholder="e.g. Carpentry & Woodwork"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)', marginBottom: 4 }}>
                  Sinhala Name (සිංහල)
                </label>
                <input
                  type="text"
                  value={nameSi}
                  onChange={(e) => setNameSi(e.target.value)}
                  placeholder="වඩු වැඩ"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    borderRadius: 'var(--radius-md, 8px)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)', marginBottom: 4 }}>
                  Tamil Name (தமிழ்)
                </label>
                <input
                  type="text"
                  value={nameTa}
                  onChange={(e) => setNameTa(e.target.value)}
                  placeholder="மரவேலை"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    borderRadius: 'var(--radius-md, 8px)',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Slug & Base Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="carpentry-woodwork"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                Base Price Hint (LKR)
              </label>
              <input
                type="number"
                min="500"
                step="100"
                value={basePriceHint}
                onChange={(e) => setBasePriceHint(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 6 }}>
              Category Icon
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.keys(ICON_MAP).map(key => {
                const IconComp = ICON_MAP[key];
                const isSelected = iconName === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIconName(key)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      border: isSelected ? '2px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)',
                      background: isSelected ? 'var(--color-brand-50, #edf7f2)' : '#ffffff',
                      color: isSelected ? 'var(--color-brand-800, #154636)' : '#64748b',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer'
                    }}
                    title={key}
                  >
                    <IconComp size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for customer catalog..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border, #cbd5e1)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '0.85rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Active Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="activeToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-brand-600, #174d3d)' }}
            />
            <label htmlFor="activeToggle" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text, #0f172a)', cursor: 'pointer' }}>
              Publish category to marketplace (Active)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmCat)}
        onClose={() => setDeleteConfirmCat(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Marketplace Category?"
        message={`Are you sure you want to remove "${deleteConfirmCat?.name}" from ARY Services? Any existing services linked to this category may lose their primary directory mapping.`}
        confirmLabel="Delete Category"
        isDanger={true}
      />
    </div>
  );
}
