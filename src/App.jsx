import { useMemo, useState } from 'react';
import { Search, MapPin, ShoppingBasket, Zap, Wrench, Sparkles, ArrowRight, ShieldCheck, ClipboardList, Users, LayoutDashboard, CheckCircle2 } from 'lucide-react';

const initialServices = [
  { id: 1, name: 'Food Shops', description: 'Explore local shops and place an order', icon: ShoppingBasket, color: 'peach' },
  { id: 2, name: 'Electrical Repair', description: 'Electricians for home and business', icon: Zap, color: 'yellow' },
  { id: 3, name: 'Plumbing', description: 'Repairs, fittings and maintenance', icon: Wrench, color: 'blue' },
  { id: 4, name: 'Other Services', description: 'Discover more services near you', icon: Sparkles, color: 'lilac' },
];

export default function App() {
  const [role, setRole] = useState('Customer');
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');
  const [services, setServices] = useState(initialServices);
  const [newCategory, setNewCategory] = useState('');
  const [notice, setNotice] = useState('');

  const filtered = useMemo(() => services.filter(s =>
    (s.name + ' ' + s.description).toLowerCase().includes(query.toLowerCase())
  ), [services, query]);

  function addCategory(e) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (services.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setNotice('That category already exists.');
      return;
    }
    setServices(prev => [...prev, { id: Date.now(), name, description: 'New service category', icon: Sparkles, color: 'lilac' }]);
    setNewCategory('');
    setNotice('Category added to this demo view. Connect the admin API/database for permanent storage.');
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="ARY Services home"><span className="brand-mark">A</span><span>ARY <b>Services</b></span></a>
      <nav className="role-switch" aria-label="Choose dashboard">
        {['Customer', 'Provider', 'Admin'].map(item =>
          <button key={item} className={role === item ? 'role active' : 'role'} onClick={() => {setRole(item); setNotice('');}}>{item}</button>
        )}
      </nav>
      <button className="sign-in" onClick={() => setNotice('Authentication will be connected in a later implementation phase.')}>Sign in <ArrowRight size={16}/></button>
    </header>

    {role === 'Customer' && <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot"/> LOCAL SERVICES, MADE SIMPLE</span>
          <h1>Good help is<br/><em>closer than you think.</em></h1>
          <p>Discover local shops and trusted service providers for the things that matter every day.</p>
          <div className="search-panel">
            <label className="search-field"><MapPin size={19}/><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your area or address"/></label>
            <label className="search-field service-search"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="What service do you need?"/></label>
            <button className="search-button" onClick={() => setNotice('Showing services matching your search.')}>Find services</button>
          </div>
          <div className="trust-row"><span><ShieldCheck size={17}/> Provider approval process</span><span><CheckCircle2 size={17}/> Clear service details</span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-circle circle-one"/><div className="art-circle circle-two"/><div className="art-card card-top"><span className="mini-icon green"><Wrench size={22}/></span><span><b>Home repairs</b><small>Find local professionals</small></span><CheckCircle2 className="art-check" size={18}/></div><div className="art-card card-bottom"><span className="mini-icon orange"><ShoppingBasket size={22}/></span><span><b>Local food shops</b><small>Explore shops around you</small></span></div><div className="art-monogram">A<span>.</span></div><span className="float-star">✳</span></div>
      </section>
      <section className="services-section">
        <div className="section-heading"><div><span className="eyebrow">WHAT DO YOU NEED TODAY?</span><h2>Explore services</h2></div><span className="section-note">Choose a category to get started <ArrowRight size={15}/></span></div>
        <div className="service-grid">{filtered.map(service => {const Icon = service.icon; return <button className="service-card" key={service.id} onClick={() => {setQuery(service.name); setNotice(service.name + ' selected. Provider listings will appear when the provider API is connected.')}}><span className={'service-icon '+service.color}><Icon size={25}/></span><span className="service-card-copy"><b>{service.name}</b><small>{service.description}</small></span><ArrowRight className="card-arrow" size={18}/></button>})}</div>
        {filtered.length === 0 && <p className="empty">No categories match your search.</p>}
      </section>
      <section className="how-section"><div><span className="eyebrow">SIMPLE BY DESIGN</span><h2>Help, in a few easy steps.</h2></div><div className="steps"><div><span>01</span><b>Choose a service</b><small>Browse categories that fit your needs.</small></div><div><span>02</span><b>Choose a provider</b><small>Review profiles and service details.</small></div><div><span>03</span><b>Confirm your request</b><small>Track the request and follow its status.</small></div></div></section>
    </main>}

    {role === 'Provider' && <main className="dashboard"><div className="dashboard-heading"><span className="eyebrow">SERVICE PARTNER SPACE</span><h1>Provider <em>dashboard.</em></h1><p>Manage your service profile and keep track of customer requests.</p></div><div className="dashboard-grid"><article className="dash-card"><ClipboardList/><h3>Service applications</h3><p>Submit services and charges for admin review before they appear publicly.</p><span className="status-pill">Approval required</span></article><article className="dash-card"><Users/><h3>Customer requests</h3><p>Review incoming bookings and update their status after account features are connected.</p><span className="status-pill muted">API integration pending</span></article><article className="dash-card"><ShieldCheck/><h3>Business verification</h3><p>Submit business details and required documents for verification.</p><span className="status-pill">Verification required</span></article></div></main>}

    {role === 'Admin' && <main className="dashboard"><div className="dashboard-heading"><span className="eyebrow">PLATFORM MANAGEMENT</span><h1>Admin <em>workspace.</em></h1><p>Manage the service categories shown in this demonstration and review the planned controls.</p></div><div className="admin-layout"><section className="admin-panel"><div className="panel-title"><LayoutDashboard/><h2>Service categories</h2></div><form className="add-category" onSubmit={addCategory}><input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. TV Repair" aria-label="New category name"/><button type="submit">Add category</button></form><p className="helper">Demo only: changes reset on refresh until the backend and database are connected.</p>{notice && <p className="notice" role="status">{notice}</p>}<ul className="category-list">{services.map(s => <li key={s.id}><span>{s.name}</span><span className="status-pill muted">Demo category</span></li>)}</ul></section><aside className="admin-side"><span className="side-icon"><ShieldCheck size={24}/></span><h3>Review before publishing</h3><p>Provider identity, business details, and provider-specific service applications should be approved before public listing.</p></aside></div></main>}

    {notice && role !== 'Admin' && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    <footer><a className="brand footer-brand" href="#"><span className="brand-mark">A</span><span>ARY <b>Services</b></span></a><span>Local services, thoughtfully connected.</span><span>© {new Date().getFullYear()} ARY Services</span></footer>
  </div>;
}
