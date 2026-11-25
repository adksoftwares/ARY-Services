import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const money = value => {
  if (value === null || value === undefined || value === '') return 'Amount unavailable';
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? `LKR ${amount.toLocaleString('en-LK', { maximumFractionDigits: 2 })}` : 'Amount unavailable';
};

export default function GroceryMarketplace() {
  const { currentUser, openAuthModal } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [ordersError, setOrdersError] = useState('');
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
  const [cancelBusy, setCancelBusy] = useState(false);
  const productsRequestRef = useRef(0);
  const ordersRequestRef = useRef(0);

  async function load() {
    const requestId = ++productsRequestRef.current;
    setLoading(true);
    try {
      const r = await fetch(API_BASE + '/grocery/products');
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Grocery products could not be loaded.');
      if (requestId !== productsRequestRef.current) return;
      if (!Array.isArray(d.products)) throw new Error('The product list response was invalid. Please retry.');
      setProducts(d.products.filter(product => product && typeof product === 'object' && product.id !== null && product.id !== undefined && String(product.id).trim() !== ''));
      setLoadError('');
    } catch (error) {
      if (requestId === productsRequestRef.current) setLoadError(error.message || 'Grocery products could not be loaded.');
    } finally {
      if (requestId === productsRequestRef.current) setLoading(false);
    }
  }

  async function loadOrders() {
    const requestId = ++ordersRequestRef.current;
    if (!currentUser?.token) {
      setOrders([]);
      setOrdersError('');
      return;
    }
    try {
      const r = await fetch(API_BASE + '/grocery/orders/mine', {
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Your grocery orders could not be loaded.');
      if (requestId !== ordersRequestRef.current) return;
      if (!Array.isArray(d.orders)) throw new Error('The orders response was invalid. Please retry.');
      setOrders(d.orders.filter(order => order && typeof order === 'object' && order.id !== null && order.id !== undefined && String(order.id).trim() !== ''));
      setOrdersError('');
    } catch (error) {
      if (requestId === ordersRequestRef.current) setOrdersError(error.message || 'Your grocery orders could not be loaded.');
    }
  }

  useEffect(() => {
    load();
    return () => { productsRequestRef.current += 1; ordersRequestRef.current += 1; };
  }, []);

  useEffect(() => {
    if (currentUser?.token) {
      setPhone(currentUser.phone || '');
      setAddress(currentUser.location || '');
      loadOrders();
    }
  }, [currentUser?.token]);

  const safeProducts = Array.isArray(products) ? products : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const categories = ['All', ...new Set(safeProducts.filter(p => p && typeof p === 'object').map(p => p.category).filter(Boolean))];

  const visible = useMemo(() => safeProducts.filter(p => p && typeof p === 'object' &&
    (category === 'All' || p.category === category) &&
    (p.name + ' ' + (p.brand || '') + ' ' + p.category + ' ' + p.providerName).toLowerCase().includes(query.toLowerCase())
  ), [safeProducts, category, query]);

  const cartLines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([productId, quantity]) => ({
      product: products.find(p => p.id === productId),
      quantity
    }))
    .filter(x => x.product);

  const total = cartLines.reduce((sum, x) => {
    const price = Number(x.product.price);
    return sum + (Number.isFinite(price) && price >= 0 ? price * x.quantity : 0);
  }, 0);
  const totalItemsCount = cartLines.reduce((sum, x) => sum + x.quantity, 0);

  // Check unique shops in cart
  const uniqueShopIds = useMemo(() => new Set(cartLines.map(x => x.product.providerId)), [cartLines]);
  const hasMultipleShops = uniqueShopIds.size > 1;
  const currentShopName = cartLines[0]?.product?.providerName;

  function changeQty(product, delta) {
    if (!product?.id || !Number.isFinite(Number(product.stock)) || Number(product.stock) < 0 || !Number.isFinite(delta)) return;
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
    if (!currentUser?.token || !cancelTargetId || cancelBusy) return;
    setCancelBusy(true);
    try {
      const r = await fetch(API_BASE + '/grocery/orders/' + encodeURIComponent(cancelTargetId) + '/cancel', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Could not cancel order.');
      setMessage(d.message || 'Order cancelled.');
      setCancelTargetId(null);
      await loadOrders();
      await load();
    } catch (e) {
      setMessage(e.message || 'Could not cancel order.');
    } finally {
      setCancelBusy(false);
    }
  }

  async function checkout(e) {
    e.preventDefault();
    if (busy) return;
    if (!currentUser) {
      openAuthModal('login');
      setMessage('Sign in as a customer to place your order.');
      return;
    }
    if (currentUser.accountType !== 'customer') {
      setMessage('Switch to your Customer account to place grocery orders.');
      return;
    }
    if (!currentUser?.token) {
      setMessage('Please sign in again before placing your order.');
      return;
    }
    if (!cartLines.length) {
      setMessage('Add at least one item before checkout.');
      return;
    }
    if (!address.trim()) {
      setMessage('Enter a delivery address to continue.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setMessage('Enter a valid contact phone number.');
      return;
    }
    const unavailableLine = cartLines.find(line => !Number.isFinite(Number(line.product.stock)) || line.quantity > Number(line.product.stock) || !Number.isFinite(Number(line.product.price)) || Number(line.product.price) < 0);
    if (unavailableLine) {
      setMessage(`${unavailableLine.product.name} is no longer available in the requested quantity. Refresh products and review your cart.`);
      await load();
      return;
    }
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
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Could not place order.');
      if (!d.order || typeof d.order !== 'object' || d.order.id === null || d.order.id === undefined || String(d.order.id).trim() === '') {
        throw new Error('The server did not confirm an order reference. Check My Orders before trying again.');
      }

      setMessage(d.order.deliveryStatus === 'driver_requested'
        ? 'Order placed. A delivery driver has been requested; check My Orders for the latest status and any handoff details.'
        : 'Order placed. Check My Orders for the latest status. Payment is cash on delivery.');
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
          <p className="section-desc">Order groceries, pantry items, and gas cylinders from local shops listed on ARY.</p>
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

      {loadError && (
        <div className="ds-toast ds-toast-warning" role="alert" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
          <span>{loadError}</span>
          <Button variant="ghost" size="sm" onClick={load} loading={loading} disabled={loading}>Retry</Button>
        </div>
      )}

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

          {ordersError && <div role="alert" className="ds-toast ds-toast-warning"><span>{ordersError}</span><Button variant="ghost" size="sm" onClick={loadOrders}>Retry</Button></div>}
          {safeOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No previous grocery orders placed yet.</p>
          ) : (
            <div className="grocery-orders-feed">
              {safeOrders.map(o => {
                const stepIndex = getOrderStatusStep(o.status);
                const isTerminal = ['completed', 'cancelled'].includes(o.status);

                return (
                  <div key={o.id} className="grocery-order-card">
                    <div className="order-top">
                      <div>
                        <b>{o.providerName}</b>
                        <span className="order-id">Ref #{String(o.id).slice(0, 8)}</span>
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
                      {(Array.isArray(o.items) ? o.items : []).map((it, idx) => (
                        <span key={idx} className="order-item-tag">
                          {it.name} × {it.quantity}
                        </span>
                      ))}
                    </div>

                    <div className="order-total-bar">
                      <span>Total: <b>{money(o.total)}</b></span>
                      <Badge variant={o.paymentStatus === 'cash_collected' ? 'success' : 'neutral'} dot={false} className="cod-badge">
                        {o.paymentStatus === 'cash_collected' ? 'Cash received' : 'Cash on Delivery'}
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
          <p>Each order can contain products from one shop at a time. Complete separate checkouts for different shops.</p>
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
      ) : loadError ? null : visible.length === 0 ? (
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
        footer={
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
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
              form="grocery-checkout-form"
              loading={busy}
              disabled={hasMultipleShops}
              style={{ flex: 2 }}
            >
              Place Cash on Delivery Order
            </Button>
          </div>
        }
      >
        <form id="grocery-checkout-form" onSubmit={checkout} className="checkout-modal-form">
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
              <p>Pay the full order total in cash when your items arrive. The driver records cash received after verifying the delivery PIN. No card or online payments.</p>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Order Cancellation */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetId)}
        onClose={() => { if (!cancelBusy) setCancelTargetId(null); }}
        title="Cancel Grocery Order"
        message="Are you sure you want to cancel this pending grocery order?"
        confirmLabel="Yes, Cancel Order"
        isDanger={true}
        onConfirm={handleConfirmCancel}
      />
    </section>
  );
}
