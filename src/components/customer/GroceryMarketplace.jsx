import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Search,
  Store,
  RefreshCw,
  ShoppingCart,
  Minus,
  Plus,
  ClipboardList,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  Truck,
  CheckCircle2,
  Clock,
  Info
} from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Badge, ConfirmDialog, Skeleton, EmptyState, Stepper, Modal } from '../../design-system';

const money = value => 'LKR ' + Number(value || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 });

export default function GroceryMarketplace() {
  const { currentUser, openAuthModal } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState({});
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(API_BASE + '/grocery/products');
      const d = await r.json();
      if (r.ok) setProducts(d.products || []);
    } catch {
      setMessage('Grocery products could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    if (!currentUser?.token) return;
    try {
      const r = await fetch(API_BASE + '/grocery/orders/mine', {
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const d = await r.json();
      if (r.ok) setOrders(d.orders || []);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (currentUser?.token) {
      setPhone(currentUser.phone || '');
      setAddress(currentUser.location || '');
      loadOrders();
    }
  }, [currentUser?.token]);

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const visible = useMemo(() => products.filter(p =>
    (category === 'All' || p.category === category) &&
    (p.name + ' ' + (p.brand || '') + ' ' + p.category + ' ' + p.providerName).toLowerCase().includes(query.toLowerCase())
  ), [products, category, query]);

  const cartLines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([productId, quantity]) => ({
      product: products.find(p => p.id === productId),
      quantity
    }))
    .filter(x => x.product);

  const total = cartLines.reduce((sum, x) => sum + Number(x.product.price) * x.quantity, 0);
  const totalItemsCount = cartLines.reduce((sum, x) => sum + x.quantity, 0);

  // Check unique shops in cart
  const uniqueShopIds = useMemo(() => new Set(cartLines.map(x => x.product.providerId)), [cartLines]);
  const hasMultipleShops = uniqueShopIds.size > 1;
  const currentShopName = cartLines[0]?.product?.providerName;

  function changeQty(product, delta) {
    setCart(old => {
      const next = { ...old };
      const current = Number(next[product.id] || 0);
      const stock = Number(product.stock);
      const val = Math.max(0, Math.min(stock, current + delta));
      if (val > 0) next[product.id] = val;
      else delete next[product.id];
      return next;
    });
  }

  async function handleConfirmCancel() {
    if (!currentUser?.token || !cancelTargetId) return;
    try {
      const r = await fetch(API_BASE + '/grocery/orders/' + encodeURIComponent(cancelTargetId) + '/cancel', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Could not cancel order.');
      setMessage(d.message || 'Order cancelled.');
      await loadOrders();
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setCancelTargetId(null);
    }
  }

  async function checkout(e) {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal('login');
      setMessage('Sign in as a customer to place your order.');
      return;
    }
    if (currentUser.accountType !== 'customer') {
      setMessage('Switch to your Customer account to place grocery orders.');
      return;
    }
    if (!cartLines.length) return;
    if (hasMultipleShops) {
      setMessage('Please checkout one shop at a time. Remove items from other shops first.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(API_BASE + '/grocery/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + currentUser.token
        },
        body: JSON.stringify({
          items: cartLines.map(x => ({ productId: x.product.id, quantity: x.quantity })),
          deliveryAddress: address,
          phone,
          notes
        })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Could not place order.');

      setMessage(d.order?.deliveryStatus === 'driver_requested'
        ? 'Order placed! An approved delivery driver has been requested. Your handoff PINs are shown in My Orders.'
        : 'Order placed! The shop will prepare your order for delivery. Pay cash on delivery.');
      setCart({});
      setIsCheckoutModalOpen(false);
      await load();
      await loadOrders();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  const getOrderStatusStep = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'preparing': case 'accepted': return 1;
      case 'in_transit': case 'out_for_delivery': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  return (
    <section className="grocery-marketplace-section" id="grocery-section" aria-labelledby="grocery-heading">
      <div className="section-heading">
        <div>
          <div className="eyebrow">LOCAL SHOPS & ESSENTIALS</div>
          <h2 id="grocery-heading">Grocery & Everyday Essentials</h2>
          <p className="section-desc">Order groceries, pantry items, and gas cylinders from verified neighborhood shops.</p>
        </div>

        <div className="grocery-header-actions">
          <Button
            variant="outline"
            size="sm"
            icon={ClipboardList}
            onClick={() => {
              setShowOrders(v => !v);
              loadOrders();
            }}
          >
            My Orders ({orders.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => { load(); loadOrders(); }}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div className={`ds-toast ${message.includes('placed') ? 'ds-toast-success' : 'ds-toast-info'}`} style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
          <span>{message}</span>
        </div>
      )}

      {/* Orders Viewer */}
      {showOrders && (
        <div className="grocery-orders-drawer" role="region" aria-label="Customer Grocery Orders">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Your Grocery Orders</h3>
            <button
              type="button"
              className="ds-icon-btn sm"
              onClick={() => setShowOrders(false)}
              aria-label="Close orders"
            >
              <X size={16} />
            </button>
          </div>

          {orders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No previous grocery orders placed yet.</p>
          ) : (
            <div className="grocery-orders-feed">
              {orders.map(o => {
                const stepIndex = getOrderStatusStep(o.status);
                const isTerminal = ['completed', 'cancelled'].includes(o.status);

                return (
                  <div key={o.id} className="grocery-order-card">
                    <div className="order-top">
                      <div>
                        <b>{o.providerName}</b>
                        <span className="order-id">Ref #{o.id?.slice(0, 8)}</span>
                      </div>
                      <Badge variant={o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'}>
                        {o.status?.replace('_', ' ')}
                      </Badge>
                    </div>

                    {!isTerminal && (
                      <div style={{ margin: '12px 0' }}>
                        <Stepper
                          steps={['Placed', 'Preparing', 'Out for Delivery', 'Delivered']}
                          currentStep={stepIndex}
                        />
                      </div>
                    )}

                    <div className="order-items-list">
                      {o.items.map((it, idx) => (
                        <span key={idx} className="order-item-tag">
                          {it.name} × {it.quantity}
                        </span>
                      ))}
                    </div>

                    <div className="order-total-bar">
                      <span>Total: <b>{money(o.total)}</b></span>
                      <Badge variant="neutral" dot={false} className="cod-badge">
                        Cash on Delivery
                      </Badge>
                    </div>

                    {o.deliveryPickupPin && o.deliveryPin && (
                      <div className="order-pins-box">
                        <ShieldCheck size={16} />
                        <div>
                          <span>Delivery Release PIN: <b>{o.deliveryPin}</b></span>
                          <small>Share with the driver only upon inspecting your packages.</small>
                        </div>
                      </div>
                    )}

                    {o.status === 'pending' && (
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelTargetId(o.id)}
                        >
                          Cancel Order
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search and Category Filter Toolbar */}
      <div className="grocery-toolbar">
        <Input
          placeholder="Search rice, dhal, milk, cooking oil, gas cylinder..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          icon={Search}
          className="grocery-search-input"
        />

        <div className="category-scroll-pills" role="radiogroup" aria-label="Grocery Categories">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              className={`cat-pill-btn ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Single Shop Rule Explanation Banner */}
      <div className="single-shop-rule-card">
        <Info size={16} className="rule-icon" />
        <div>
          <b>Single-Shop Cart Rule</b>
          <p>To ensure freshness and rapid point-to-point courier delivery, items in your cart must come from a single shop per order.</p>
        </div>
      </div>

      {hasMultipleShops && (
        <div className="ds-toast ds-toast-warning" style={{ width: '100%', marginBottom: 'var(--space-4)' }} role="alert">
          <AlertCircle size={16} />
          <span><b>Multiple shops detected:</b> Your cart contains items from more than one store. Please clear items or checkout one shop at a time.</span>
        </div>
      )}

      {/* Product Grid / Loading Skeletons */}
      {loading ? (
        <div className="product-catalog-grid">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="product-item-card skeleton-card">
              <Skeleton width="100%" height="80px" />
              <Skeleton width="70%" height="16px" style={{ margin: '8px 0 4px' }} />
              <Skeleton width="40%" height="14px" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products listed"
          description={products.length ? 'No grocery items match your search.' : 'Local grocery shops have not listed items in this category yet.'}
        />
      ) : (
        <div className="product-catalog-grid">
          {visible.map(p => {
            const qty = cart[p.id] || 0;
            const stock = Number(p.stock || 0);
            const isOutOfStock = stock <= 0;

            return (
              <article key={p.id} className="product-item-card">
                <div className="product-img-box">
                  <Package size={28} className="product-icon" />
                  {stock <= 5 && stock > 0 && (
                    <span className="low-stock-tag">Only {stock} left</span>
                  )}
                  {isOutOfStock && (
                    <span className="out-of-stock-tag">Out of stock</span>
                  )}
                </div>

                <div className="product-card-body">
                  <span className="product-cat-label">{p.category}</span>
                  <h4 className="product-name">{p.name}</h4>
                  <div className="product-spec">
                    {p.brand || 'Local Brand'} · {p.packSize} {p.unit === 'kg_cylinder' ? 'kg cylinder' : p.unit}
                  </div>

                  <div className="product-price-row">
                    <b className="product-price">{money(p.price)}</b>
                    <span className="product-shop">
                      <Store size={12} /> {p.providerName}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="qty-stepper-box">
                    <button
                      type="button"
                      className="ds-icon-btn sm"
                      onClick={() => changeQty(p, -1)}
                      disabled={qty <= 0}
                      aria-label={`Decrease ${p.name} quantity`}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="qty-counter" aria-label={`Current quantity ${qty}`}>{qty}</span>
                    <button
                      type="button"
                      className="ds-icon-btn sm"
                      onClick={() => changeQty(p, 1)}
                      disabled={qty >= stock || isOutOfStock}
                      aria-label={`Increase ${p.name} quantity`}
                    >
                      <Plus size={14} />
                    </button>

                    {qty > 0 && (
                      <span className="subtotal-label">
                        {money(p.price * qty)}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Persistent Floating Cart Bar (Shown when items > 0) */}
      {cartLines.length > 0 && (
        <div className="persistent-cart-bar" role="region" aria-label="Persistent Shopping Cart">
          <div className="persistent-cart-left">
            <div className="cart-count-badge">
              <ShoppingCart size={18} />
              <span>{totalItemsCount}</span>
            </div>
            <div className="cart-pricing-details">
              <b className="cart-total-amount">{money(total)}</b>
              <span className="cart-shop-name">
                <Store size={12} /> {currentShopName} • <span className="cod-label">Cash on Delivery</span>
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            className="cart-checkout-cta"
            disabled={hasMultipleShops}
            onClick={() => setIsCheckoutModalOpen(true)}
          >
            Review & Checkout <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {/* Checkout BottomSheet Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Checkout Grocery Order"
        isBottomSheet={true}
        size="md"
      >
        <form onSubmit={checkout} className="checkout-modal-form">
          <div className="cart-header">
            <b>{currentShopName}</b>
            <span className="cart-total-badge">{money(total)}</span>
          </div>

          <div className="cart-items-preview">
            {cartLines.map(x => (
              <div key={x.product.id} className="cart-item-row">
                <span>{x.product.name} × {x.quantity}</span>
                <b>{money(x.product.price * x.quantity)}</b>
              </div>
            ))}
          </div>

          <div className="cart-form-grid">
            <Input
              label="Delivery Address *"
              required={true}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="House/Apartment #, Street, Town"
            />
            <Input
              label="Contact Phone *"
              required={true}
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07X XXX XXXX"
            />
            <Input
              label="Delivery Notes (Optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Leave with security or call on arrival"
            />
          </div>

          <div className="cod-security-callout">
            <ShieldCheck size={18} />
            <div>
              <b>Cash on Delivery (COD)</b>
              <p>Pay cash directly to the delivery driver upon receiving and inspecting your items. 4-digit verification PIN provided.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-4)' }}>
            <Button
              variant="ghost"
              size="lg"
              type="button"
              onClick={() => setIsCheckoutModalOpen(false)}
              style={{ flex: 1 }}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              type="submit"
              loading={busy}
              disabled={hasMultipleShops}
              style={{ flex: 2 }}
            >
              Place Cash on Delivery Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Order Cancellation */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        title="Cancel Grocery Order"
        message="Are you sure you want to cancel this pending grocery order? The shop will be notified immediately."
        confirmLabel="Yes, Cancel Order"
        isDanger={true}
        onConfirm={handleConfirmCancel}
      />
    </section>
  );
}
