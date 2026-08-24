const { createClient } = window.supabase;
const cfg = window.UFB_CONFIG || {};
const app = document.getElementById('app');
let sb = null;
let state = { session:null, profile:null, page:'dashboard', items:[], todayIn:0, todayOut:0, error:'', message:'', mobile:false };
const $ = (s)=>document.querySelector(s);
const money = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const num = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:3});
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const today = ()=>new Date().toISOString().slice(0,10);

function configReady(){ return cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR_') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_'); }
function showLogin(){
  app.innerHTML=`<div class="login"><div class="login-card"><img class="login-logo" src="public/urban-fruit-bowl-logo.jpg" alt="Urban Fruit Bowl"><h1>Inventory Management</h1><p>Stock In • Stock Out • Current Stock</p>${state.error?`<div class="alert error">${esc(state.error)}</div>`:''}<form id="loginForm" class="grid"><div class="field full"><label>Email</label><input id="email" type="email" required placeholder="admin@example.com"></div><div class="field full"><label>Password</label><input id="password" type="password" required placeholder="••••••••"></div><div class="field full"><button class="btn primary" style="width:100%">Sign In</button></div></form><div class="help">Use a user created in Supabase Authentication.</div></div></div>`;
  $('#loginForm').onsubmit=async e=>{e.preventDefault();state.error='';render();const {error}=await sb.auth.signInWithPassword({email:$('#email').value,password:$('#password').value});if(error){state.error=error.message;render();}};
}
async function loadProfile(){const {data,error}=await sb.from('profiles').select('*').eq('id',state.session.user.id).single();if(error)throw error;state.profile=data;}
async function loadData(){
  const [inv,tx] = await Promise.all([sb.from('inventory_summary').select('*').order('name'),sb.from('stock_transactions').select('txn_type,total_value').eq('txn_date',today())]);
  if(inv.error)throw inv.error;if(tx.error)throw tx.error;state.items=inv.data||[];state.todayIn=(tx.data||[]).filter(x=>x.txn_type==='IN').reduce((a,x)=>a+Number(x.total_value||0),0);state.todayOut=(tx.data||[]).filter(x=>x.txn_type==='OUT').reduce((a,x)=>a+Number(x.total_value||0),0);
}
function metric(icon,label,value,cls){return `<div class="card"><div class="metric"><div><div class="label">${label}</div><div class="value">${value}</div></div><div class="metric-icon ${cls}">${icon}</div></div></div>`;}
function icon(name){return ({box:'📦',down:'↓',up:'↑',money:'₹',warn:'!'})[name]||'•';}
function shell(){
  const p=state.page;const role=state.profile?.role||'store';const name=state.profile?.full_name||state.profile?.email||'User';
  app.innerHTML=`<div class="app"><aside class="sidebar ${state.mobile?'open':''}"><div class="brand"><img src="public/urban-fruit-bowl-logo.jpg"><div><div class="brand-title">Urban Fruit Bowl</div><div class="brand-sub">INVENTORY</div></div></div><nav class="nav"><button class="${p==='dashboard'?'active':''}" data-page="dashboard">▦ Dashboard</button><button class="${p==='in'?'active':''}" data-page="in">↓ Stock In</button><button class="${p==='out'?'active':''}" data-page="out">↑ Stock Out</button></nav><div class="side-bottom"><button id="logout" class="btn secondary" style="width:100%">↪ Sign Out</button></div></aside><main class="main"><div class="topbar"><div style="display:flex;align-items:center;gap:10px"><button id="mobileBtn" class="btn secondary mobile">☰</button><div class="title"><h1>${p==='dashboard'?'Dashboard':p==='in'?'Stock In':'Stock Out'}</h1><p>${p==='dashboard'?'Live overview of your inventory':p==='in'?'Record incoming purchases and stock receipts':'Record material issued from the store'}</p></div></div><div class="user"><div class="avatar">${esc(name).slice(0,1).toUpperCase()}</div><div class="user-meta"><strong>${esc(name)}</strong><div class="role">${role}</div></div></div></div>${state.message?`<div class="alert success">${esc(state.message)}</div>`:''}${state.error?`<div class="alert error">${esc(state.error)}</div>`:''}<div id="content"></div></main></div>`;
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;state.mobile=false;state.message='';state.error='';render();});
  $('#logout').onclick=()=>sb.auth.signOut();$('#mobileBtn').onclick=()=>{state.mobile=!state.mobile;shell()};
  if(p==='dashboard') dashboard();else formPage(p.toUpperCase());
}
function dashboard(){
  const items=state.items,totalValue=items.reduce((s,i)=>s+Number(i.current_value||0),0),low=items.filter(i=>Number(i.current_qty||0)>0&&Number(i.current_qty||0)<=Number(i.min_stock||0)).length;
  const out=items.filter(i=>Number(i.current_qty||0)<=0).length;
  $('#content').innerHTML=`<div class="cards">${metric(icon('box'),'Stock Items',items.length,'greenbg')}${metric(icon('down'),"Today's Stock In",money(state.todayIn),'darkbg')}${metric(icon('up'),"Today's Stock Out",money(state.todayOut),'redbg')}${metric(icon('money'),'Current Stock Value',money(totalValue),'greenbg')}</div><div class="card"><div class="section-head"><div><h2>Current Stock</h2><p>Balance = total Stock In − total Stock Out.</p></div><div class="toolbar">${state.profile?.role==='admin'?'<button id="addItem" class="btn secondary">＋ Add Item</button>':''}<button id="refresh" class="btn secondary">↻ Refresh</button></div></div>${items.length?`<div class="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Unit</th><th class="num">Available</th><th class="num">Avg. Rate</th><th class="num">Stock Value</th><th>Status</th></tr></thead><tbody>${items.map(i=>{const q=Number(i.current_qty||0),m=Number(i.min_stock||0),c=q<=0?'out':q<=m?'low':'ok',t=c==='out'?'Out of Stock':c==='low'?'Low Stock':'Available';return `<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.category)}</td><td>${esc(i.unit)}</td><td class="num">${num(q)}</td><td class="num">${money(i.avg_rate)}</td><td class="num">${money(i.current_value)}</td><td><span class="status ${c}">${t}</span></td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">No items yet. Admin can add your first inventory item.</div>`}</div><div class="help" style="margin-top:10px">Low stock: ${low} &nbsp; • &nbsp; Out of stock: ${out}</div>`;
  $('#refresh').onclick=async()=>{await loadData();state.message='Stock refreshed.';render();};
  if($('#addItem'))$('#addItem').onclick=addItemModal;
}
function formPage(type){
  const isIn=type==='IN';const items=state.items.filter(i=>i.active);let lines=[{item_id:'',quantity:'',rate:''}];
  $('#content').innerHTML=`<div class="card form-card"><div class="section-head"><div><h2>New Stock ${isIn?'In':'Out'}</h2><p>${isIn?'Record purchased stock with quantity and purchase rate.':'Issue stock from inventory. Rate is calculated automatically using weighted-average cost.'}</p></div></div><div id="formError"></div><div class="grid"><div class="field"><label>Date</label><input id="txnDate" type="date" value="${today()}"></div><div class="field"><label>Reference / Invoice No. (optional)</label><input id="ref" placeholder="INV-001"></div><div class="field full"><label>Notes (optional)</label><textarea id="notes" rows="2" placeholder="${isIn?'Supplier / purchase note':'Kitchen / usage note'}"></textarea></div></div><div class="editor"><div class="row head"><div>Item</div><div>Quantity</div><div>${isIn?'Rate':'Avg. Rate'}</div><div>Amount</div><div></div></div><div id="lines"></div><div style="padding:10px 12px"><button id="addLine" class="btn secondary">＋ Add Item</button></div><div class="total" id="total">Total Value: ₹0.00</div></div><div class="actions"><button id="saveTxn" class="btn ${isIn?'primary':'green'}">Save Stock ${isIn?'In':'Out'}</button></div></div>`;
  function draw(){
    $('#lines').innerHTML=lines.map((l,idx)=>{const item=items.find(i=>i.id===l.item_id);const rate=isIn?Number(l.rate||0):Number(item?.avg_rate||0);const amount=Number(l.quantity||0)*rate;return `<div class="row"><select data-k="item_id" data-i="${idx}"><option value="">Select item</option>${items.map(i=>`<option value="${i.id}" ${i.id===l.item_id?'selected':''}>${esc(i.name)} (${esc(i.unit)})</option>`).join('')}</select><input data-k="quantity" data-i="${idx}" type="number" min="0" step="0.001" value="${esc(l.quantity)}" placeholder="0"><div>${isIn?`<input data-k="rate" data-i="${idx}" type="number" min="0" step="0.01" value="${esc(l.rate)}" placeholder="₹0.00">`:`<strong>${money(rate)}</strong>`}</div><strong>${money(amount)}</strong><button class="icon remove" data-i="${idx}">×</button></div>`}).join('');
    $('#total').textContent='Total Value: '+money(lines.reduce((s,l)=>{const i=items.find(x=>x.id===l.item_id);const r=isIn?Number(l.rate||0):Number(i?.avg_rate||0);return s+Number(l.quantity||0)*r},0));
    $('#lines').querySelectorAll('[data-k]').forEach(el=>el.oninput=()=>{lines[+el.dataset.i][el.dataset.k]=el.value;draw();});
    $('#lines').querySelectorAll('.remove').forEach(b=>b.onclick=()=>{if(lines.length>1){lines.splice(+b.dataset.i,1);draw();}});
  }
  $('#addLine').onclick=()=>{lines.push({item_id:'',quantity:'',rate:''});draw();};
  $('#saveTxn').onclick=async()=>{const valid=lines.filter(l=>l.item_id&&Number(l.quantity)>0);const er=$('#formError');if(!valid.length){er.innerHTML='<div class="alert error">Add at least one valid item.</div>';return}if(isIn&&valid.some(l=>l.rate===''||Number(l.rate)<0)){er.innerHTML='<div class="alert error">Enter a valid rate for every Stock In item.</div>';return}if(!isIn){for(const l of valid){const i=items.find(x=>x.id===l.item_id);if(!i||Number(l.quantity)>Number(i.current_qty||0)){er.innerHTML=`<div class="alert error">Insufficient stock for ${esc(i?.name||'selected item')}. Available: ${num(i?.current_qty||0)}.</div>`;return}}}
    $('#saveTxn').disabled=true;$('#saveTxn').textContent='Saving…';
    const payload=valid.map(l=>({item_id:l.item_id,quantity:Number(l.quantity),...(isIn?{rate:Number(l.rate)}:{})}));
    const {error}=await sb.rpc(isIn?'create_stock_in':'create_stock_out',{p_txn_date:$('#txnDate').value,p_reference_no:$('#ref').value||null,p_notes:$('#notes').value||null,p_items:payload});
    if(error){er.innerHTML=`<div class="alert error">${esc(error.message)}</div>`;$('#saveTxn').disabled=false;$('#saveTxn').textContent='Save Stock '+(isIn?'In':'Out');return}
    state.page='dashboard';state.message=`Stock ${isIn?'In':'Out'} saved successfully.`;await loadData();render();
  };
  draw();
}
function addItemModal(){
  const bg=document.createElement('div');bg.className='modal-bg';bg.innerHTML=`<div class="modal"><div class="modal-head"><h3>Add Inventory Item</h3><button class="icon" id="close">×</button></div><div id="merr"></div><div class="grid"><div class="field full"><label>Item Name</label><input id="iname" placeholder="e.g. Apple"></div><div class="field"><label>Category</label><select id="icat"><option>Fruits</option><option>Vegetables</option><option>Nuts</option><option>Packaging</option><option>Juice</option><option>Miscellaneous</option></select></div><div class="field"><label>Unit</label><select id="iunit"><option>KG</option><option>PCS</option><option>BOX</option><option>L</option><option>PACK</option></select></div><div class="field"><label>Minimum Stock</label><input id="imin" type="number" min="0" step="0.001" value="0"></div></div><div class="actions"><button id="cancel" class="btn secondary">Cancel</button><button id="saveItem" class="btn primary">Save Item</button></div></div>`;document.body.appendChild(bg);const close=()=>bg.remove();bg.querySelector('#close').onclick=close;bg.querySelector('#cancel').onclick=close;bg.querySelector('#saveItem').onclick=async()=>{const name=bg.querySelector('#iname').value.trim();if(!name){bg.querySelector('#merr').innerHTML='<div class="alert error">Item name is required.</div>';return}bg.querySelector('#saveItem').disabled=true;const {error}=await sb.from('items').insert({name,category:bg.querySelector('#icat').value,unit:bg.querySelector('#iunit').value,min_stock:Number(bg.querySelector('#imin').value||0)});if(error){bg.querySelector('#merr').innerHTML=`<div class="alert error">${esc(error.message)}</div>`;bg.querySelector('#saveItem').disabled=false}else{close();await loadData();state.message='Item added successfully.';render();}};
}
function render(){ if(!state.session){showLogin();return} shell(); }
async function init(){
  if(!configReady()){app.innerHTML='<div class="login"><div class="login-card"><img class="login-logo" src="public/urban-fruit-bowl-logo.jpg"><h1>Setup Required</h1><p>Open <strong>config.js</strong> and enter your Supabase Project URL and anon/publishable key.</p><div class="alert error">Do not use the Supabase service_role key in this file.</div></div></div>';return;}
  sb=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  const {data}=await sb.auth.getSession();state.session=data.session;
  if(state.session){try{await loadProfile();await loadData();}catch(e){state.error=e.message||String(e)}}
  render();
  sb.auth.onAuthStateChange(async(_event,session)=>{state.session=session;if(session){try{await loadProfile();await loadData();}catch(e){state.error=e.message||String(e)}}else state.profile=null;render();});
}
init();
