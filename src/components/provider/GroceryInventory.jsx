import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Package, Search, Pencil, Trash2, Save, X, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';

const UNIT_GROUPS = {
  weight: [{value:'g',label:'Gram (g)'},{value:'kg',label:'Kilogram (kg)'}],
  volume: [{value:'ml',label:'Millilitre (ml)'},{value:'L',label:'Litre (L)'}],
  count: [{value:'piece',label:'Piece / Count'},{value:'egg_tray',label:'Tray'},{value:'dozen',label:'Dozen'},{value:'pack',label:'Pack'},{value:'box',label:'Box'},{value:'bottle',label:'Bottle'},{value:'can',label:'Can'},{value:'sachet',label:'Sachet'}],
  length: [{value:'cm',label:'Centimetre (cm)'},{value:'m',label:'Metre (m)'}],
  area: [{value:'sqft',label:'Square foot (sq ft)'}],
  gas: [{value:'kg_cylinder',label:'Gas cylinder (kg)'}]
};
const CATEGORIES=['Rice & Grains','Flour & Baking','Dhal, Pulses & Beans','Sugar, Salt & Spices','Cooking Oil & Ghee','Milk & Dairy','Eggs','Beverages & Water','Canned & Packaged Food','Snacks & Biscuits','Fresh Vegetables','Fresh Fruits','Meat & Seafood','Bread & Bakery','Personal Care','Laundry & Cleaning','Household Essentials','Gas Cylinders','Baby Products','Pet Supplies','Other'];
const blank={name:'',category:'Rice & Grains',brand:'',unitGroup:'weight',unit:'kg',packSize:'1',price:'',stock:'',lowStock:'5',sku:'',description:'',isAvailable:true};
export default function GroceryInventory(){
 const {currentUser}=useAuth();const [items,setItems]=useState([]);const [form,setForm]=useState(blank);const [editing,setEditing]=useState(null);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [query,setQuery]=useState('');
 const units=UNIT_GROUPS[form.unitGroup]||UNIT_GROUPS.count;
 async function load(){if(!currentUser?.token)return;setLoading(true);try{const r=await fetch(API_BASE+'/grocery/products/mine',{headers:{Authorization:'Bearer '+currentUser.token}});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not load inventory');setItems(d.products||[]);}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{load();},[currentUser?.token]);
 function change(k,v){setForm(old=>({...old,[k]:v,...(k==='unitGroup'?{unit:(UNIT_GROUPS[v]||UNIT_GROUPS.count)[0].value}:{})}));}
 function edit(item){setEditing(item.id);setForm({...blank,...item,price:String(item.price),stock:String(item.stock),lowStock:String(item.lowStock??5),packSize:String(item.packSize??1)});setError('');}
 function reset(){setEditing(null);setForm(blank);setError('');}
 async function save(e){e.preventDefault();setSaving(true);setError('');try{const payload={...form,price:Number(form.price),stock:Number(form.stock),lowStock:Number(form.lowStock),packSize:Number(form.packSize)};const r=await fetch(API_BASE+'/grocery/products'+(editing?'/'+editing:''),{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+currentUser.token},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not save product');reset();await load();}catch(e){setError(e.message);}finally{setSaving(false);}}
 async function remove(id){if(!window.confirm('Remove this product from your shop inventory?'))return;try{const r=await fetch(API_BASE+'/grocery/products/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+currentUser.token}});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not delete product');setItems(old=>old.filter(x=>x.id!==id));}catch(e){setError(e.message);}}
 const filtered=useMemo(()=>items.filter(x=>(x.name+' '+x.category+' '+(x.brand||'')).toLowerCase().includes(query.toLowerCase())),[items,query]);
 const lowCount=items.filter(x=>Number(x.stock)<=Number(x.lowStock??5)).length;
 return <section style={{background:'#fff',border:'1px solid #e5ebe6',borderRadius:14,padding:18}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><div><span style={{fontSize:11,fontWeight:800,letterSpacing:1,color:'#56806a'}}>GROCERY SHOP MANAGEMENT</span><h2 style={{margin:'4px 0'}}>Product Inventory</h2><p style={{margin:0,color:'#64748b',fontSize:13}}>Add products with the correct selling unit, pack size, price and stock quantity.</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><span style={{background:'#f0fdf4',padding:'8px 11px',borderRadius:8,fontSize:12}}> {items.length} products</span><span style={{background:'#fff7ed',padding:'8px 11px',borderRadius:8,fontSize:12}}>{lowCount} low stock</span></div></div>
  {error&&<p role="alert" style={{background:'#fef2f2',color:'#b91c1c',padding:10,borderRadius:8,fontSize:13}}>{error}</p>}
  <form onSubmit={save} style={{marginTop:16,padding:14,border:'1px solid #e2e8f0',borderRadius:12,background:'#fafcfb'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b>{editing?'Edit product':'Add a new product'}</b>{editing&&<button type="button" onClick={reset} style={{border:0,background:'transparent'}}><X size={18}/></button>}</div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:12}}>
    <label style={lab}>Product name *<input required value={form.name} onChange={e=>change('name',e.target.value)} placeholder="e.g. Samba Rice" style={inp}/></label>
    <label style={lab}>Category *<select value={form.category} onChange={e=>change('category',e.target.value)} style={inp}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label>
    <label style={lab}>Brand<input value={form.brand} onChange={e=>change('brand',e.target.value)} placeholder="e.g. Prima / Munchee" style={inp}/></label>
    <label style={lab}>Unit type *<select value={form.unitGroup} onChange={e=>change('unitGroup',e.target.value)} style={inp}><option value="weight">Weight</option><option value="volume">Volume</option><option value="count">Count / Pack</option><option value="length">Length</option><option value="area">Area</option><option value="gas">Gas cylinder</option></select></label>
    <label style={lab}>Selling unit *<select value={form.unit} onChange={e=>change('unit',e.target.value)} style={inp}>{units.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select></label>
    <label style={lab}>Pack / item size *<input required type="number" min="0.001" step="0.001" value={form.packSize} onChange={e=>change('packSize',e.target.value)} style={inp}/></label>
    <label style={lab}>Selling price (LKR) *<input required type="number" min="0" step="0.01" value={form.price} onChange={e=>change('price',e.target.value)} placeholder="e.g. 250" style={inp}/></label>
    <label style={lab}>Available stock *<input required type="number" min="0" step="1" value={form.stock} onChange={e=>change('stock',e.target.value)} placeholder="e.g. 30 packs" style={inp}/></label>
    <label style={lab}>Low-stock alert at<input type="number" min="0" value={form.lowStock} onChange={e=>change('lowStock',e.target.value)} style={inp}/></label>
    <label style={lab}>SKU / Barcode (optional)<input value={form.sku} onChange={e=>change('sku',e.target.value)} style={inp}/></label>
    <label style={{...lab,gridColumn:'1/-1'}}>Description (optional)<textarea rows="2" value={form.description} onChange={e=>change('description',e.target.value)} style={inp}/></label>
   </div>
   <div style={{fontSize:12,color:'#64748b',margin:'8px 0'}}>Example: Gas cylinder → Gas cylinder unit → pack size 12.5 kg. Add 2.3 kg, 5 kg and 12.5 kg cylinders as separate product entries.</div>
   <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><label style={{fontSize:13}}><input type="checkbox" checked={form.isAvailable} onChange={e=>change('isAvailable',e.target.checked)}/> Available for customers</label><button disabled={saving} style={{background:'#174d3d',color:'#fff',border:0,borderRadius:8,padding:'10px 16px',fontWeight:700,display:'inline-flex',gap:7,alignItems:'center'}}><Save size={15}/>{saving?'Saving...':editing?'Update product':'Add product'}</button></div>
  </form>
  <div style={{display:'flex',alignItems:'center',gap:8,margin:'18px 0 10px',border:'1px solid #e2e8f0',borderRadius:8,padding:'8px 10px'}}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, brands or categories..." style={{border:0,outline:0,flex:1}}/></div>
  {loading?<p>Loading inventory...</p>:filtered.length===0?<p style={{padding:20,textAlign:'center',color:'#64748b'}}>No products yet. Add your first grocery product above.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:680}}><thead><tr style={{textAlign:'left',background:'#f8fafc'}}>{['Product','Category','Pack size','Price','Stock','Status','Actions'].map(x=><th key={x} style={{padding:10}}>{x}</th>)}</tr></thead><tbody>{filtered.map(item=><tr key={item.id} style={{borderBottom:'1px solid #edf1ed'}}><td style={{padding:10}}><b>{item.name}</b><div style={{fontSize:11,color:'#64748b'}}>{item.brand||item.sku||''}</div></td><td style={{padding:10}}>{item.category}</td><td style={{padding:10}}>{item.packSize} {item.unit}</td><td style={{padding:10,fontWeight:700}}>LKR {Number(item.price).toLocaleString()}</td><td style={{padding:10}}>{item.stock} {item.unit}{Number(item.stock)<=Number(item.lowStock??5)&&<div style={{color:'#b45309',fontSize:11}}>Low stock</div>}</td><td style={{padding:10}}>{item.isAvailable?'Available':'Hidden'}</td><td style={{padding:10,whiteSpace:'nowrap'}}><button type="button" onClick={()=>edit(item)} title="Edit" style={action}><Pencil size={15}/></button> <button type="button" onClick={()=>remove(item.id)} title="Delete" style={{...action,color:'#b91c1c'}}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>}
 </section>;
}
const lab={display:'flex',flexDirection:'column',gap:5,fontSize:12,fontWeight:600,color:'#334155'};
const inp={width:'100%',boxSizing:'border-box',padding:10,border:'1px solid #d6dfd8',borderRadius:7,background:'#fff',font:'inherit',fontWeight:400};
const action={border:'1px solid #dce5dc',background:'#fff',borderRadius:6,padding:7,cursor:'pointer'};
