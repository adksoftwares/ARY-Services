import React, { useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button, Input } from '../../design-system';

export default function AdminCategories({
  services = [],
  setServices,
  onNotice
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('peach');

  function handleAddCategory(e) {
    e.preventDefault();
    if (!name.trim()) return;

    const autoSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCat = {
      id: Date.now(),
      name: name.trim(),
      slug: autoSlug,
      description: description.trim() || 'Professional services on ARY Marketplace',
      color
    };

    setServices(prev => [...prev, newCat]);
    setName('');
    setSlug('');
    setDescription('');
    onNotice?.(`Category "${newCat.name}" added successfully.`);
  }

  function handleDeleteCategory(id, catName) {
    if (services.length <= 1) {
      alert('You must retain at least one active service category.');
      return;
    }
    setServices(prev => prev.filter(c => c.id !== id));
    onNotice?.(`Category "${catName}" removed.`);
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Add Category Card */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Create New Service Marketplace Category
        </h3>

        <form onSubmit={handleAddCategory} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                Category Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }
                }}
                placeholder="e.g. Carpentry & Woodwork"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                URL Slug
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. carpentry-woodwork"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                Color Theme Tag
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  background: '#fff'
                }}
              >
                <option value="peach">Peach (Warm Accent)</option>
                <option value="yellow">Yellow (Electrical / Amber)</option>
                <option value="blue">Blue (Plumbing / Calm)</option>
                <option value="lilac">Lilac (Specialty)</option>
                <option value="green">Green (Grocery / Eco)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
              Short Customer Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Certified carpenters for furniture, doors and window repairs"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border, #cbd5e1)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" type="submit">
              <Plus size={16} /> Add Category
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Existing Categories List */}
      <Card style={{ padding: '20px' }}>
        <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Active Marketplace Categories ({services.length})
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {services.map(cat => (
            <div
              key={cat.id || cat.slug}
              style={{
                padding: '14px',
                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 10
              }}
            >
              <div>
                <b style={{ fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>{cat.name}</b>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', margin: '2px 0 6px' }}>
                  Slug: <code>{cat.slug}</code> · Tag: {cat.color}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)', lineHeight: 1.4 }}>
                  {cat.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  padding: 4
                }}
                title={`Delete ${cat.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
