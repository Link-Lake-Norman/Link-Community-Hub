const state={items:[],nonprofits:[]},modal=document.getElementById('requestModal'),form=document.getElementById('requestForm'),statusNode=document.getElementById('requestStatus');const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
async function safeJson(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json')){
    const e=new Error('STATIC_PREVIEW');
    e.code='STATIC_PREVIEW';
    throw e;
  }
  return response.json();
}

async function load(){
  try{
    const [rr,nr]=await Promise.all([
      fetch('/api/resources/public'),
      fetch('/api/nonprofits/public')
    ]);

    const resources=await safeJson(rr);
    const nonprofits=await safeJson(nr);

    if(!rr.ok)throw new Error(resources.error||'Resources could not be loaded.');
    if(!nr.ok)throw new Error(nonprofits.error||'Approved nonprofits could not be loaded.');

    state.items=resources.items||[];
    state.nonprofits=nonprofits.organizations||[];

    render();
    renderNonprofits();

  }catch(error){

    state.items=[];
    state.nonprofits=[];

    render();
    renderNonprofits();

    const n=document.getElementById('pageStatus');

    if(
      error.code==='STATIC_PREVIEW' &&
      (location.hostname==='localhost'||location.hostname==='127.0.0.1')
    ){
      n.className='page-status preview';
      n.textContent='Local preview: live Resource Exchange listings will load when the LINK API is running.';
      return;
    }

    console.error(error);

    n.className='page-status error';
    n.textContent='Live resources are temporarily unavailable.';
  }
}
function card(i){const image=i.images?.[0]?.image_url||i.image_url||'';return `<article class="resource-card">${image?`<img class="resource-image" src="${esc(image)}" alt="${esc(i.title)}" loading="lazy">`:'<div class="resource-image-placeholder"><img src="/lakenorman/assets/brand/link-round-logo.png" alt=""></div>'}<div class="resource-body"><div class="business-name">${esc(i.business_name)}</div><h2>${esc(i.title)}</h2>${i.description?`<p>${esc(i.description)}</p>`:''}${i.quantity_text?`<p><strong>Quantity:</strong> ${esc(i.quantity_text)}</p>`:''}${i.availability_notes?`<p><strong>Availability:</strong> ${esc(i.availability_notes)}</p>`:''}<button class="primary" type="button" data-request-item="${esc(i.id)}">Request This Item</button></div></article>`;}
function render(){document.getElementById('resourceGrid').innerHTML=state.items.map(card).join('')||'<div class="empty">No business resources are currently listed. Check back soon.</div>';Array.from(document.querySelectorAll('[data-request-item]')).forEach(b=>b.onclick=()=>openModal(state.items.find(i=>i.id===b.dataset.requestItem)));}
function renderNonprofits(){document.getElementById('nonprofitSelect').innerHTML='<option value="">Select your organization</option>'+state.nonprofits.map(o=>`<option value="${esc(o.id)}">${esc(o.display_name)}</option>`).join('');}
function openModal(item){document.getElementById('requestItemId').value=item.id;document.getElementById('requestTitle').textContent=`Request: ${item.title}`;statusNode.textContent='';statusNode.className='status';modal.classList.add('open');modal.setAttribute('aria-hidden','false');}function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');form.reset();form.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=false);}document.getElementById('closeModal').onclick=closeModal;modal.onclick=e=>{if(e.target===modal)closeModal();};
form.onsubmit=async e=>{e.preventDefault();statusNode.className='status';statusNode.textContent='Sending request…';try{const response=await fetch('/api/resources/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemId:document.getElementById('requestItemId').value,nonprofitOrganizationId:document.getElementById('nonprofitSelect').value,contactName:document.getElementById('contactName').value,contactEmail:document.getElementById('contactEmail').value,message:document.getElementById('message').value,disclaimerAccepted:document.getElementById('disclaimerAccepted').checked})});const data=await response.json();if(!response.ok){if(data.nextEligibleAt)throw new Error(`${data.error} Next eligible: ${new Date(data.nextEligibleAt).toLocaleDateString()}.`);throw new Error(data.error||'Request could not be sent.');}statusNode.className='status success';statusNode.textContent=data.message;form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);}catch(error){statusNode.className='status error';statusNode.textContent=error.message;}};
load();
