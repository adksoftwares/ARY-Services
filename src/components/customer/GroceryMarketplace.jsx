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
  ArrowRight
} from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Badge, ConfirmDialog, Skeleton, EmptyState } from '../../design-system';

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

  // Check unique shops in cart
  const uniqueShopIds = useMemo(() => new Set(cartLines.map(x => x.product.providerId)), [cartLines]);
  const hasMultipleShops = uniqueShopIds.size > 1;

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
      await load();
      await loadOrders();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grocery-marketplace-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">FRESH ESSENTIALS & LOCAL SHOPS</div>
          <h2>Grocery Products</h2>
          <p className="section-desc">Everyday household goods and groceries from verified local suppliers.</p>
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
            onClick={load}
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
        <div className="grocery-orders-drawer">
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
              {orders.map(o => (
                <div key={o.id} className="grocery-order-card">
                  <div className="order-top">
                    <div>
                      <b>{o.providerName}</b>
                      <span className="order-id">Ref #{o.id?.slice(0, 8)}</span>
                    </div>
                    <Badge variant={o.status === 'completed' ? 'success' : 'warning'}>
                      {o.status?.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="order-items-list">
                    {o.items.map((it, idx) => (
                      <span key={idx} className="order-item-tag">
                        {it.name} × {it.quantity}
                      </span>
                    ))}
                  </div>

                  <div className="order-total-bar">
                    <span>Total Amount: <b>{money(o.total)}</b> (Cash on Delivery)</span>
                  </div>

                  {o.deliveryPickupPin && o.deliveryPin && (
                    <div className="order-pins-box">
                      <ShieldCheck size={14} />
                      <div>
                        <span>Handoff PIN: <b>{o.deliveryPin}</b> (Share when receiving package)</span>
                      </div>
                    </div>
                  )}

                  {o.status === 'pending' && (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setCancelTargetId(o.id)}
                      >
                        Cancel Order
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and Category Filter */}
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

      {/* Single Shop Cart Rule Notice */}
      {hasMultipleShops && (
        <div className="ds-toast ds-toast-warning" style={{ width: '100%', marginBottom: 'var(--space-4)' }} role="alert">
          <AlertCircle size={16} />
          <span><b>Single Shop Rule:</b> Your cart contains items from multiple shops. Please order from one shop at a time for dedicated delivery.</span>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="product-catalog-grid">
          {[1, 2, 3, 4].map(n => (
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
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="qty-counter">{qty}</span>
                    <button
                      type="button"
                      className="ds-icon-btn sm"
                      onClick={() => changeQty(p, 1)}
                      disabled={qty >= stock || isOutOfStock}
                      aria-label="Increase quantity"
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

      {/* Cart Summary & Checkout */}
      {cartLines.length > 0 && (
        <form className="floating-cart-panel" onSubmit={checkout}>
          <div className="cart-header">
            <h3>
              <ShoppingCart size={18} />
              <span>Your Cart ({cartLines.reduce((s, x) => s + x.quantity, 0)} items)</span>
            </h3>
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
              placeholder="Where should groceries be delivered?"
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
              placeholder="Any specific delivery instructions"
            />
          </div>

          <div className="cart-checkout-actions">
            <span className="cash-on-delivery-note">
              Payment: Cash on Delivery (Pay driver upon arrival)
            </span>
            <Button
              variant="primary"
              size="lg"
              type="submit"
              loading={busy}
              disabled={hasMultipleShops}
              iconRight={ArrowRight}
            >
              {busy ? 'Placing Order...' : `Place Order · ${money(total)}`}
            </Button>
          </div>
        </form>
      )}

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        title="Cancel Grocery Order"
        message="Cancel this grocery order? Reserved items will be returned to stock."
        confirmLabel="Yes, Cancel"
        isDanger={true}
        onConfirm={handleConfirmCancel}
      />
    </section>
  );
}
