import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  Check,
  Ban,
  Package,
  CheckCheck,
  CheckCircle2,
  RefreshCw,
  Phone,
  MapPin,
  AlertTriangle,
  Truck,
  DollarSign
} from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAppEvents } from '../../utils/events';
import { Card, Badge, Button, StatusPill, EmptyState, Skeleton, ConfirmDialog, SegmentedControl } from '../../design-system';

const STATUS_COLUMNS = [
  { id: 'pending', label: 'New Orders', icon: Clock },
  { id: 'preparing', label: 'Preparing', icon: Package },
  { id: 'ready_for_pickup', label: 'Ready for Pickup', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancelled', icon: Ban }
];

export default function GroceryOrders() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [cancelOrderTarget, setCancelOrderTarget] = useState(null);
  const [activeMobileColumn, setActiveMobileColumn] = useState('pending');

  const load = useCallback(async () => {
    if (!currentUser?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grocery/orders/provider`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load store orders');
      setOrders(data.orders || []);
    } catch (e) {
      setError(e.message || 'Error loading orders');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    load();
    if (!currentUser?.token) return undefined;
    return subscribeToAppEvents(currentUser.token, {
      'grocery:order_created': load,
      'grocery:order_updated': load
    });
  }, [load, currentUser?.token]);

  async function updateOrderStatus(orderId, status) {
    setBusyId(orderId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/grocery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update order status');
      await load();
    } catch (e) {
      setError(e.message || 'Error updating order status');
    } finally {
      setBusyId('');
    }
  }

  // Group orders into columns
  const groupedOrders = useMemo(() => {
    return {
      pending: orders.filter(o => o.status === 'pending'),
      preparing: orders.filter(o => ['accepted', 'preparing'].includes(o.status)),
      ready_for_pickup: orders.filter(o => o.status === 'ready_for_pickup'),
      completed: orders.filter(o => ['delivered', 'completed'].includes(o.status)),
      cancelled: orders.filter(o => o.status === 'cancelled')
    };
  }, [orders]);

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <Skeleton height="80px" radius="10px" />
        <Skeleton height="160px" radius="10px" />
        <Skeleton height="160px" radius="10px" />
      </div>
    );
  }

  return (
    <div className="grocery-orders-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-brand-900, #173b2f)' }}>
            Grocery Store Orders
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-500, #64748b)' }}>
            Accept customer grocery orders, pack items, and coordinate driver pickup
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw size={14} /> Refresh Orders
        </Button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* 2. Mobile View Selector (< 1200px) */}
      <div style={{ maxWidth: 680 }}>
        <SegmentedControl
          options={STATUS_COLUMNS.map(col => ({
            value: col.id,
            label: `${col.label} (${(groupedOrders[col.id] || []).length})`
          }))}
          value={activeMobileColumn}
          onChange={setActiveMobileColumn}
        />
      </div>

      {/* 3. Orders Display: Responsive Kanban Board */}
      <div className="grocery-board-container">
        {STATUS_COLUMNS.map(col => {
          const colOrders = groupedOrders[col.id] || [];
          const IconComponent = col.icon;
          // Hide inactive columns on mobile screens if activeMobileColumn is set
          const isHiddenOnMobile = activeMobileColumn !== col.id;

          return (
            <div
              key={col.id}
              className={`grocery-column ${isHiddenOnMobile ? 'mobile-hidden' : ''}`}
              style={{ display: isHiddenOnMobile ? undefined : 'flex' }}
            >
              <div className="grocery-column-header">
                <span className="grocery-column-title">
                  <IconComponent size={15} color="var(--color-brand-600, #174d3d)" />
                  {col.label}
                </span>
                <Badge variant={colOrders.length > 0 ? 'brand' : 'neutral'} dot={false}>
                  {colOrders.length}
                </Badge>
              </div>

              {colOrders.length === 0 ? (
                <div style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--color-neutral-400, #94a3b8)',
                  fontSize: '0.8rem'
                }}>
                  No orders in this state
                </div>
              ) : (
                colOrders.map(o => (
                  <div key={o.id} className="grocery-order-card">
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: '0.92rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                        #{o.id.slice(-6)}
                      </b>
                      <b style={{ fontSize: '0.95rem', color: 'var(--color-brand-800, #174d3d)' }}>
                        LKR {Number(o.total || 0).toLocaleString('en-LK')}
                      </b>
                    </div>

                    {/* Customer & Address */}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
                      <div><b>{o.customerName}</b> · <a href={`tel:${o.customerPhone}`} style={{ color: 'var(--color-brand-600, #174d3d)', fontWeight: 600 }}>{o.customerPhone}</a></div>
                      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {o.deliveryAddress}
                      </div>
                    </div>

                    {/* Item List */}
                    <div style={{
                      padding: '8px 10px',
                      background: 'var(--color-surface-subtle, #f8faf8)',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--color-border-subtle, #e5ebe2)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}>
                      {(o.items || []).map((item, idx) => (
                        <div key={idx} className="grocery-item-row">
                          <span>{item.name} × <b>{item.quantity}</b></span>
                          <span style={{ color: 'var(--color-neutral-500, #64748b)' }}>LKR {Number(item.unitPrice || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-neutral-400, #94a3b8)' }}>
                      <span>Cash on Delivery</span>
                      <span>{new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Action Row per State */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {o.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={busyId === o.id}
                            onClick={() => updateOrderStatus(o.id, 'accepted')}
                            style={{ flex: 1 }}
                          >
                            <Check size={14} /> Accept Order
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setCancelOrderTarget(o)}
                          >
                            <Ban size={14} /> Cancel
                          </Button>
                        </>
                      )}

                      {o.status === 'accepted' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={busyId === o.id}
                            onClick={() => updateOrderStatus(o.id, 'preparing')}
                            style={{ flex: 1 }}
                          >
                            <Package size={14} /> Start Packing
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelOrderTarget(o)}
                          >
                            <Ban size={14} /> Cancel
                          </Button>
                        </>
                      )}

                      {o.status === 'preparing' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === o.id}
                          onClick={() => updateOrderStatus(o.id, 'ready_for_pickup')}
                          style={{ width: '100%' }}
                        >
                          <CheckCheck size={14} /> Mark Ready for Pickup
                        </Button>
                      )}

                      {o.status === 'ready_for_pickup' && (
                        <div style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '6px',
                          background: 'var(--color-brand-50, #edf7f2)',
                          borderRadius: 'var(--radius-sm, 6px)',
                          fontSize: '0.78rem',
                          color: 'var(--color-brand-800, #154636)',
                          fontWeight: 700
                        }}>
                          ⏳ Awaiting Driver Pickup
                        </div>
                      )}

                      {['delivered', 'completed'].includes(o.status) && (
                        <div style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '6px',
                          background: 'var(--color-success-50, #ecfdf5)',
                          borderRadius: 'var(--radius-sm, 6px)',
                          fontSize: '0.78rem',
                          color: 'var(--color-success-700, #047857)',
                          fontWeight: 700
                        }}>
                          ✓ Completed & Paid
                        </div>
                      )}

                      {o.status === 'cancelled' && (
                        <div style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '6px',
                          background: 'var(--color-neutral-100, #f1f5f9)',
                          borderRadius: 'var(--radius-sm, 6px)',
                          fontSize: '0.78rem',
                          color: 'var(--color-neutral-600, #475569)'
                        }}>
                          Cancelled (Stock Restored)
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel Order ConfirmDialog with Stock Restore Note */}
      <ConfirmDialog
        isOpen={Boolean(cancelOrderTarget)}
        title="Cancel Grocery Order?"
        message="Cancelling this order will immediately notify the customer and automatically restore stock quantities for all items in the store inventory."
        confirmLabel="Cancel Order & Restore Stock"
        cancelLabel="Keep Order Active"
        variant="danger"
        onConfirm={() => {
          if (cancelOrderTarget) {
            updateOrderStatus(cancelOrderTarget.id, 'cancelled');
            setCancelOrderTarget(null);
          }
        }}
        onCancel={() => setCancelOrderTarget(null)}
      />
    </div>
  );
}
