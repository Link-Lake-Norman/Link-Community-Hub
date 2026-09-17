(()=>{"use strict";
const API="/api/nonprofits/admin/business-management",KEY="link_ecosystem_admin_secret";let secret=sessionStorage.getItem(KEY)||"",businesses=[],selected=null,detail=null;
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])),money=c=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(c||0)/100),date=v=>v?new Date(v).toLocaleDateString():"—";

function prepareAdminImage(file,maxDimension=1600,quality=.84){
  return new Promise((resolve,reject)=>{
    if(!file){
      reject(new Error("Choose an image first."));
      return;
    }

    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      reject(new Error("Use a JPG, PNG or WebP image."));
      return;
    }

    const reader=new FileReader();

    reader.onerror=()=>reject(
      new Error("The image could not be read.")
    );

    reader.onload=()=>{
      const image=new Image();

      image.onerror=()=>reject(
        new Error("The selected file could not be opened as an image.")
      );

      image.onload=()=>{
        const largest=Math.max(image.width,image.height);
        const scale=largest>maxDimension
          ? maxDimension/largest
          : 1;

        const canvas=document.createElement("canvas");

        canvas.width=Math.max(
          1,
          Math.round(image.width*scale)
        );

        canvas.height=Math.max(
          1,
          Math.round(image.height*scale)
        );

        const ctx=canvas.getContext("2d");

        if(!ctx){
          reject(new Error("Image preparation is unavailable."));
          return;
        }

        ctx.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob(
          blob=>{
            if(!blob){
              reject(new Error("The image could not be prepared."));
              return;
            }

            const output=new FileReader();

            output.onerror=()=>reject(
              new Error("The prepared image could not be read.")
            );

            output.onload=()=>resolve(output.result);

            output.readAsDataURL(blob);
          },
          "image/webp",
          quality
        );
      };

      image.src=reader.result;
    };

    reader.readAsDataURL(file);
  });
}

async function request(url=API,options={}){const response=await fetch(url,{...options,headers:{Accept:"application/json",Authorization:`Bearer ${secret}`,...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(data.error||"Request failed.");e.status=response.status;throw e}return data}
function lock(){secret="";sessionStorage.removeItem(KEY);$("bam-app").hidden=true;$("bam-auth").hidden=false;$("bam-key").value=""}
async function loadList(){const data=await request();businesses=data.businesses||[];renderList();if(selected&&businesses.some(b=>b.id===selected))await openBusiness(selected)}
function renderList(){const q=$("bam-search").value.trim().toLowerCase(),rows=businesses.filter(b=>`${b.business_name} ${b.contact_name} ${b.email}`.toLowerCase().includes(q));$("bam-counts").innerHTML=`<span class="pill">${businesses.length} total</span><span class="pill">${businesses.filter(b=>b.status==='pending').length} pending</span><span class="pill">${businesses.filter(b=>b.status==='active').length} active</span>`;$("bam-list").innerHTML=rows.map(b=>`<button class="business-button${b.id===selected?' active':''}" data-business="${b.id}"><strong>${esc(b.business_name)}</strong><small>${esc(b.contact_name)} · ${esc(b.status)} · ${esc(b.plan_tier)}</small></button>`).join("")||"<p>No matching businesses.</p>"}
async function openBusiness(id){selected=id;renderList();$("bam-workspace").innerHTML='<div class="empty">Loading business record…</div>';detail=await request(`${API}?businessId=${encodeURIComponent(id)}`);renderWorkspace()}
function check(name,value,label){return `
<label class="check"><input type="checkbox" name="${name}"${value?' checked':''}> ${label}</label>`}
function businessFileVisibilityLabel(value){
  return ({
    private:"Admin Only",
    public:"Public — Everyone",
    resource_public:"Public — Resource Preview",
    nonprofit_portal:"Nonprofit Portal Members Only"
  })[value]||value;
}
function option(value,current,label){return `<option value="${value}"${value===current?' selected':''}>${label}</option>`}
function renderWorkspace(){const b=detail.business,p=detail.payments||[],docs=detail.documents||[],resources=detail.resources||[],activity=detail.activity||[],contentSubmissions=detail.contentSubmissions||[];$("bam-workspace").innerHTML=`
<div class="workspace-head"><div><p class="eyebrow">BUSINESS CLIENT RECORD</p><h2>${esc(b.business_name)}</h2><p>${esc(b.contact_name)} · ${esc(b.email)}</p></div><div class="workspace-actions"><span class="status">${esc(b.status)}</span>${b.status==='pending'?'<button type="button" class="approve" data-approve-business>Approve & Activate</button>':''}</div></div>
${b.status==='active'?'<p class="approved-note">✓ Approved and active. Membership, visibility, resources, files and financial records can be managed below.</p>':''}
<div class="tabs"><button class="active" data-tab="profile">Profile & Level</button><button data-tab="money">Payments & Contract</button><button data-tab="resources">Resources (${resources.length})</button><button data-tab="content">Events & Media (${contentSubmissions.length})</button><button data-tab="files">Files (${docs.length})</button><button data-tab="history">History</button></div>
<div class="tab-panel" data-panel="profile"><form class="section-card" data-form="business"><h3>Business, Membership & Visibility</h3><div class="grid">
<label>Business name *<input name="businessName" required value="${esc(b.business_name)}"></label>
<label>Contact name *<input name="contactName" required value="${esc(b.contact_name)}"></label>
<label>Email *<input name="email" type="email" required value="${esc(b.email)}"></label>
<label>Phone<input name="phone" value="${esc(b.phone)}"></label>
<label class="wide">Website<input name="websiteUrl" value="${esc(b.website_url)}"></label>
<label class="wide">Business description<textarea name="description" rows="4">${esc(b.description)}</textarea></label><div class="wide business-logo-admin">
<div class="record-head">
<strong>Business Logo / Profile Image</strong>
<span>${b.logo_url?'Current image saved':'No image uploaded'}</span>
</div>
${b.logo_url?`<div class="business-logo-preview"><img src="${esc(b.logo_url)}" alt="${esc(b.business_name)} logo"></div>`:''}
<div class="business-logo-upload" data-business-logo-control>
<label>Upload logo or business image
<input data-business-logo-file type="file" accept="image/jpeg,image/png,image/webp">
</label>
<div class="form-status" data-business-logo-status></div>
<button class="secondary" type="button" data-upload-business-logo>Upload Business Image</button>
</div>
</div>

<label>Street address<input name="addressLine1" value="${esc(b.address_line1)}"></label>
<label>Suite / unit<input name="addressLine2" value="${esc(b.address_line2)}"></label>
<label>City<input name="city" value="${esc(b.city)}"></label>
<label>State<input name="state" value="${esc(b.state||'NC')}"></label>
<label>ZIP<input name="postalCode" value="${esc(b.postal_code)}"></label>
${b.plan_tier==='community_free'
?'<div class="wide notice"><strong>Resource Contributor — Free</strong><br>No payment link is required for the free tier.</div>'
:`<label class="wide">QuickBooks payment link<span class="field-help">Paid participation levels may use a secure QuickBooks payment link.</span><input name="paymentLinkUrl" type="url" placeholder="https://..." value="${esc(b.payment_link_url)}"></label>`}
<label>Status<select name="status">
${option('pending',b.status,'Pending')}
${option('active',b.status,'Active')}
${option('closed',b.status,'Closed')}</select></label>
<label>Membership level<select name="planTier">
${option('community_free',b.plan_tier,'Resource Contributor — Free')}

${option('community_partner',b.plan_tier,'Community Ally')}
${option('impact_partner',b.plan_tier,'Impact Partner')}
${option('community_champion',b.plan_tier,'Community Champion')}
${option('presenting_partner',b.plan_tier,'Presenting Partner')}</select></label>
<label>Resource limit<input name="activeListingLimit" type="number" min="0" max="100" value="${Number(b.active_listing_limit||0)}"></label>
<label>Next follow-up<input name="nextFollowUpAt" type="datetime-local" value="${b.next_follow_up_at?String(b.next_follow_up_at).slice(0,16):''}"></label>
<label class="wide">Private Admin notes<textarea name="adminNotes">${esc(b.admin_notes)}</textarea></label></div><div class="checks">${check('publicProfileEnabled',b.public_profile_enabled,'Public business profile')}${check('publicLogoEnabled',b.public_logo_enabled,'Public logo')}${check('publicLinkEnabled',b.public_link_enabled,'Public website link')}${check('featuredPlacementEnabled',b.featured_placement_enabled,'Featured placement')}${check('expandedImpactEnabled',b.expanded_impact_enabled,'Expanded impact')}${check('partnerBadgeEnabled',b.partner_badge_enabled,'Badge and sticker access')}${check('nonprofitServicesEnabled',b.nonprofit_services_enabled,'Services for nonprofits')}</div><input type="hidden" name="contractStatus" value="${esc(b.contract_status||'none')}"><input type="hidden" name="contractValue" value="${Number(b.contract_value_cents||0)/100}"><input type="hidden" name="contractSignedAt" value="${b.contract_signed_at||''}"><input type="hidden" name="contractStartsAt" value="${b.contract_starts_at||''}"><input type="hidden" name="contractEndsAt" value="${b.contract_ends_at||''}"><input type="hidden" name="renewalDueAt" value="${b.renewal_due_at||''}"><div class="form-status"></div><button class="primary">Save Business</button></form></div>
<div class="tab-panel" data-panel="money" hidden><form class="section-card" data-form="contract"><h3>Contract & Renewal</h3><div class="grid">
<label>Contract status<select name="contractStatus">${['none','draft','sent','signed','expired','cancelled'].map(v=>option(v,b.contract_status||'none',v[0].toUpperCase()+v.slice(1))).join('')}</select></label>
<label>Contract value ($)<input name="contractValue" type="number" min="0" step=".01" value="${Number(b.contract_value_cents||0)/100}"></label>
<label>Signed date<input name="contractSignedAt" type="datetime-local" value="${b.contract_signed_at?String(b.contract_signed_at).slice(0,16):''}"></label>
<label>Contract starts<input name="contractStartsAt" type="date" value="${b.contract_starts_at||''}"></label>
<label>Contract ends<input name="contractEndsAt" type="date" value="${b.contract_ends_at||''}"></label>
<label>Renewal due<input name="renewalDueAt" type="date" value="${b.renewal_due_at||''}"></label></div><div class="form-status"></div><button class="primary">Save Contract Controls</button></form><form class="section-card" data-form="payment"><h3>Record Payment or In-Kind Value</h3><div class="grid">
<label>Entry type<select name="entryType"><option value="payment">Payment received</option><option value="in-kind">In-kind contribution</option><option value="credit">Credit</option><option value="refund">Refund</option></select></label>
<label>Amount ($)<input name="amount" type="number" min="0" step=".01" required></label>
<label>Date<input name="paidAt" type="date" required value="${new Date().toISOString().slice(0,10)}"></label>
<label>Method<input name="paymentMethod" placeholder="Card, check, ACH, in-kind…"></label>
<label>Reference<input name="referenceCode" placeholder="Invoice, check or transaction reference"></label>
<label class="wide">Notes<textarea name="notes"></textarea></label></div><div class="form-status"></div><button class="primary">Add Entry</button></form><section class="section-card"><h3>Recorded Value: <span class="money">${money(b.recorded_value_cents)}</span></h3><div class="record-list">${p.map(x=>`<article class="record"><div class="record-head"><strong>${esc(x.entry_type)}</strong><span class="money">${money(x.amount_cents)}</span></div><p>${date(x.paid_at)} · ${esc(x.payment_method||'No method')} · ${esc(x.reference_code||'No reference')}</p><p>${esc(x.notes||'')}</p></article>`).join('')||'<p>No payments or in-kind value recorded.</p>'}</div></section></div>
<div class="tab-panel" data-panel="resources" hidden><form class="section-card" data-form="resource"><h3>Add Resource or In-Kind Offer</h3><div class="grid">
<label>Title *<input name="title" required></label>
<label>Category *<input name="category" required placeholder="Professional service, supplies, venue…"></label>
<label class="wide">Description *<textarea name="description" required></textarea></label>
<label>Quantity<input name="quantityText"></label>
<label>Estimated value ($)<input name="estimatedValue" type="number" min="0" step=".01" value="0"></label>
<label>Status<select name="status"><option value="available">Available</option><option value="paused">Private/paused</option><option value="removed">Removed</option></select></label>
<label>Expires<input name="expiresAt" type="datetime-local"></label>
<label class="wide">Availability notes<textarea name="availabilityNotes"></textarea></label>
<label class="wide">Pickup or fulfillment instructions<textarea name="pickupInstructions"></textarea></label></div><div class="form-status"></div><button class="primary">Add Resource</button></form><section class="section-card"><h3>Business Resources</h3><p>Edit the listing, add up to three images, or change its availability. Remove preserves request and impact history.</p><div class="record-list">${resources.map(x=>{const images=Array.isArray(x.images)?x.images:[];const hero=(images[0]&&images[0].image_url)||x.image_url||"";return `<article class="record resource-admin-card">${hero?`<img class="resource-admin-image" src="${esc(hero)}" alt="${esc((images[0]&&images[0].alt_text)||x.title)}">`:`<div class="resource-admin-image-empty">No image yet</div>`}<div class="record-head"><strong>${esc(x.title)}</strong><span>${esc(x.status)}</span></div><p>${esc(x.category)} · ${money(x.estimated_value_cents)}</p><p>${esc(x.description)}</p><details class="resource-editor"><summary>Edit Resource</summary><form data-form="resource-edit"><input type="hidden" name="itemId" value="${esc(x.id)}"><div class="grid"><label>Title *<input name="title" required value="${esc(x.title)}"></label><label>Category *<input name="category" required value="${esc(x.category)}"></label><label class="wide">Description *<textarea name="description" required>${esc(x.description)}</textarea></label><label>Quantity<input name="quantityText" value="${esc(x.quantity_text||'')}"></label><label>Estimated value ($)<input name="estimatedValue" type="number" min="0" step="0.01" value="${Number(x.estimated_value_cents||0)/100}"></label><label>Status<select name="status">${option('available',x.status,'Available')}${option('paused',x.status,'Private / paused')}${option('removed',x.status,'Removed')}</select></label><label>Expiration<input name="expiresAt" type="date" value="${x.expires_at?esc(String(x.expires_at).slice(0,10)):''}"></label><label class="wide">Availability notes<textarea name="availabilityNotes">${esc(x.availability_notes||'')}</textarea></label><label class="wide">Pickup / fulfillment instructions<textarea name="pickupInstructions">${esc(x.pickup_instructions||'')}</textarea></label></div><div class="form-status"></div><button class="primary">Save Resource Changes</button></form></details><div class="resource-image-manager"><strong>Resource Images</strong><p>${images.length} of 3 images</p><div class="resource-image-grid">${images.map(img=>`<div class="resource-image-thumb"><img src="${esc(img.image_url)}" alt="${esc(img.alt_text||x.title)}"><button type="button" class="danger" data-delete-resource-image="${esc(img.id)}" data-resource-id="${esc(x.id)}">Remove image</button></div>`).join('')}</div>${images.length<3?`<label class="resource-image-upload">Add image<input type="file" accept="image/jpeg,image/png,image/webp" data-resource-image-file="${esc(x.id)}"></label><label>Image description<input data-resource-image-alt="${esc(x.id)}" value="${esc(x.title)}"></label><button type="button" data-upload-resource-image="${esc(x.id)}">Upload Resource Image</button>`:''}</div><div class="record-actions">${x.status!=='available'?`<button type="button" data-resource-status="available" data-resource-id="${x.id}">Make Available</button>`:''}${x.status!=='paused'?`<button type="button" data-resource-status="paused" data-resource-id="${x.id}">Pause</button>`:''}${x.status!=='removed'?`<button type="button" data-resource-status="removed" data-resource-id="${x.id}">Remove</button>`:''}${x.status==='paused'?`<button type="button" data-delete-resource="${x.id}">Delete Mistaken Draft</button>`:''}</div></article>`}).join('')||'<p>No resources posted.</p>'}</div></section></div>
<div class="tab-panel" data-panel="content" hidden><section class="section-card"><h3>Business Event, Flyer & Media Review</h3><p>Approve only authorized submissions. Approved items publish to the business-selected Events, Media or Both placement.</p><div class="record-list">${contentSubmissions.map(x=>`<article class="record"><div class="record-head"><strong>${esc(x.title)}</strong><span>${esc(x.status)}</span></div><p>${esc(x.content_type)} · ${esc(x.placement)}${x.starts_at?' · '+date(x.starts_at):''}</p><p>${esc(x.description||'')}</p>${x.storage_url?`<a class="button-link" href="${esc(x.storage_url)}" target="_blank" rel="noopener">Open image / flyer</a>`:''}${x.status==='pending-review'?` <button type="button" class="approve" data-content-review="approved" data-submission-id="${x.id}">Approve + Publish</button> <button type="button" data-content-review="rejected" data-submission-id="${x.id}">Reject</button>`:''}</article>`).join('')||'<p>No business content awaiting review.</p>'}</div></section></div>
<div class="tab-panel" data-panel="files" hidden><form class="section-card private" data-form="file"><h3>Upload Business Asset or Document</h3><p class="notice"><strong>Choose who may access this file.</strong> Contracts, W-9s, invoices, receipts and internal records should remain Admin Only. Free Community Businesses may share with approved nonprofit members and may use Resource Preview for public resource images, but general-public business marketing is reserved for paid Community Partner levels.</p><div class="grid">
<label>Type<select name="documentKind"><option value="contract">Contract</option><option value="logo">Logo</option><option value="flyer">Flyer</option><option value="invoice">Invoice</option><option value="receipt">Receipt</option><option value="w9">W-9</option><option value="proposal">Proposal</option><option value="other">Other</option></select></label>
<label>Visibility
<select name="visibility">
  <option value="private">Admin Only — LINK administrators only</option>
  <option value="public" ${b.plan_tier==='community_free'?'disabled':''}>Public — Everyone${b.plan_tier==='community_free'?' — paid levels only':''}</option>
  <option value="resource_public">Public — Resource Preview</option>
  <option value="nonprofit_portal">Nonprofit Portal Members Only</option>
</select>
<span class="field-help">
Admin Only = internal LINK records. Public = general-public asset.
Resource Preview = image-only public resource asset without private contact/pickup details.
Nonprofit Portal = approved LINK nonprofit members only.
</span>
</label>
<label>Title *<input name="title" required></label>
<label>Signed date<input name="signedAt" type="date"></label>
<label class="wide">File *<input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label>
<label class="wide">Notes<textarea name="notes"></textarea></label></div><div class="form-status"></div><button class="primary">Securely Upload</button></form><section class="section-card"><h3>Files</h3><div class="record-list">${docs.map(x=>`<article class="record ${x.visibility}"><div class="record-head"><strong>${esc(x.title)}</strong><span>${esc(businessFileVisibilityLabel(x.visibility))} · ${esc(x.status)}</span></div><p>${esc(x.document_kind)} · ${esc(x.file_name)} · ${Math.ceil(Number(x.file_size_bytes||0)/1024)} KB</p><p>${esc(x.notes||'')}</p>${x.status==='active'?(['private','nonprofit_portal'].includes(x.visibility)?`<button class="button-link" type="button" data-private-file="${x.id}" data-file-name="${esc(x.file_name)}">Download Secure File</button>`:`<a class="button-link" href="${esc(x.storage_url)}" target="_blank" rel="noopener">Open Public Asset</a>`)+` <button class="secondary" data-archive="${x.id}">Archive</button>`:''}</article>`).join('')||'<p>No files uploaded.</p>'}</div></section></div>
<div class="tab-panel" data-panel="history" hidden><section class="section-card"><h3>Admin Audit History</h3><div class="record-list">${activity.map(x=>`<article class="record"><div class="record-head"><strong>${esc(x.summary)}</strong><span>${date(x.created_at)}</span></div><p>${esc(x.action)} · ${esc(x.actor)}</p></article>`).join('')||'<p>No Admin activity recorded yet.</p>'}</div></section></div>`}
async function post(payload){return request(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})}
function values(form){const out={};new FormData(form).forEach((v,k)=>out[k]=v);form.querySelectorAll('input[type="checkbox"]').forEach(i=>out[i.name]=i.checked);return out}
async function submit(form,payload){const status=form.querySelector('.form-status'),button=form.querySelector('button[type="submit"],button.primary');button.disabled=true;status.textContent="Saving…";try{const data=await post(payload);status.textContent=data.message||"Saved.";await loadList();if(selected)await openBusiness(selected)}catch(e){status.textContent=e.message}finally{button.disabled=false}}
$("bam-auth-form").addEventListener("submit",async e=>{e.preventDefault();const key=$("bam-key").value.trim();try{const response=await fetch('/api/nonprofits/admin/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Admin access could not be verified.");secret="";sessionStorage.removeItem(KEY);$("bam-auth").hidden=true;$("bam-app").hidden=false;await loadList()}catch(err){$("bam-auth-error").textContent=err.message;secret=""}});
$("bam-list").addEventListener("click",e=>{const b=e.target.closest('[data-business]');if(b)openBusiness(b.dataset.business).catch(err=>$("bam-workspace").textContent=err.message)});$("bam-search").addEventListener("input",renderList);$("bam-refresh").onclick=()=>loadList();$("bam-lock").onclick=lock;$("bam-create").onclick=()=>$("bam-create-dialog").showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$("bam-create-form").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,v=values(f);await submit(f,{action:"create-business",...v,activeListingLimit:Number(v.activeListingLimit)});f.reset();$("bam-create-dialog").close()});

$("bam-workspace").addEventListener("click",async e=>{const approve=e.target.closest('[data-approve-business]');if(approve){if(!confirm(`Approve and activate ${detail.business.business_name}?`))return;approve.disabled=true;try{const data=await post({action:'approve-business',businessId:selected});alert(data.message||'Business approved and activated.');await loadList();await openBusiness(selected)}catch(error){alert(error.message)}finally{approve.disabled=false}return}const tab=e.target.closest('[data-tab]');if(tab){$("bam-workspace").querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===tab));$("bam-workspace").querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==tab.dataset.tab)}const privateFile=e.target.closest('[data-private-file]');if(privateFile){privateFile.disabled=true;try{const response=await fetch(`/api/nonprofits/admin/business-file?id=${encodeURIComponent(privateFile.dataset.privateFile)}`,{headers:{Authorization:`Bearer ${secret}`}});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Private file could not be downloaded.')}const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=privateFile.dataset.fileName||'private-file';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){alert(error.message)}finally{privateFile.disabled=false}}const archive=e.target.closest('[data-archive]');if(archive&&confirm('Archive this file? It will not be deleted.')){await post({action:'archive-document',businessId:selected,documentId:archive.dataset.archive});await openBusiness(selected)}});

$("bam-workspace").addEventListener("submit",async e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();const v=values(f),kind=f.dataset.form;if(kind==='business'){await submit(f,{action:'save-business',businessId:selected,...v,activeListingLimit:Number(v.activeListingLimit),contractValue:Number(v.contractValue)})}if(kind==='contract'){const b=detail.business;await submit(f,{action:'save-business',businessId:selected,businessName:b.business_name,contactName:b.contact_name,email:b.email,phone:b.phone,websiteUrl:b.website_url,status:b.status,planTier:b.plan_tier,activeListingLimit:Number(b.active_listing_limit),publicProfileEnabled:b.public_profile_enabled,publicLogoEnabled:b.public_logo_enabled,publicLinkEnabled:b.public_link_enabled,featuredPlacementEnabled:b.featured_placement_enabled,expandedImpactEnabled:b.expanded_impact_enabled,partnerBadgeEnabled:b.partner_badge_enabled,nonprofitServicesEnabled:b.nonprofit_services_enabled,adminNotes:b.admin_notes,nextFollowUpAt:b.next_follow_up_at,...v,contractValue:Number(v.contractValue)})}if(kind==='payment')await submit(f,{action:'add-payment',businessId:selected,...v,amount:Number(v.amount)});
if(kind==='business-logo'){
const file=f.elements.file.files[0];
if(!file)return;
const dataUrl=await new Promise((resolve,reject)=>{
const r=new FileReader();
r.onload=()=>resolve(r.result);
r.onerror=reject;
r.readAsDataURL(file);
});
await submit(f,{
action:'upload-document',
businessId:selected,
documentKind:'logo',
visibility:'public',
title:`${detail.business.business_name} Logo`,
fileName:file.name,
notes:'Business profile logo',
signedAt:'',
dataUrl
});
await openBusiness(selected);
}if(kind==='resource')await submit(f,{action:'save-resource',businessId:selected,...v,estimatedValue:Number(v.estimatedValue)});if(kind==='resource-edit')await submit(f,{action:'save-resource',businessId:selected,...v,itemId:v.itemId,estimatedValue:Number(v.estimatedValue)});if(kind==='file'){const file=f.elements.file.files[0];if(!file)return;const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});await submit(f,{action:'upload-document',businessId:selected,documentKind:v.documentKind,visibility:v.visibility,title:v.title,signedAt:v.signedAt,notes:v.notes,fileName:file.name,dataUrl})}});

$("bam-workspace").addEventListener("click",async e=>{
  const button=e.target.closest("[data-upload-business-logo]");

  if(!button)return;

  const control=button.closest("[data-business-logo-control]");
  const fileInput=control?.querySelector("[data-business-logo-file]");
  const statusNode=control?.querySelector("[data-business-logo-status]");
  const file=fileInput?.files?.[0];

  if(!file){
    if(statusNode)statusNode.textContent="Choose an image first.";
    return;
  }

  button.disabled=true;

  if(statusNode){
    statusNode.textContent="Preparing business image…";
  }

  try{
    const dataUrl=await prepareAdminImage(
      file,
      1200,
      .88
    );

    const data=await post({
      action:"upload-document",
      businessId:selected,
      documentKind:"logo",
      visibility:"public",
      title:`${detail.business.business_name} Logo`,
      signedAt:"",
      notes:"Business profile logo",
      fileName:file.name,
      dataUrl
    });

    if(statusNode){
      statusNode.textContent=
        data.message||"Business image uploaded.";
    }

    await openBusiness(selected);
  }catch(error){
    if(statusNode){
      statusNode.textContent=
        error.message||"Business image could not be uploaded.";
    }
  }finally{
    button.disabled=false;
  }
});

async function openExistingSession(){secret="";try{await request();$("bam-auth").hidden=true;$("bam-app").hidden=false;await loadList()}catch(error){if(error.status!==401)$("bam-auth-error").textContent=error.message}}
$("bam-workspace").addEventListener("click",async e=>{const statusButton=e.target.closest('[data-resource-status]');if(statusButton){statusButton.disabled=true;try{await post({action:'set-resource-status',businessId:selected,itemId:statusButton.dataset.resourceId,status:statusButton.dataset.resourceStatus});await openBusiness(selected)}catch(error){alert(error.message)}return}const deleteButton=e.target.closest('[data-delete-resource]');if(deleteButton){if(!confirm('Permanently delete this mistaken unpublished draft?'))return;deleteButton.disabled=true;try{await post({action:'delete-resource-draft',businessId:selected,itemId:deleteButton.dataset.deleteResource});await openBusiness(selected)}catch(error){alert(error.message)}}});
$("bam-workspace").addEventListener("click",async e=>{const review=e.target.closest('[data-content-review]');if(!review)return;if(review.dataset.contentReview==='approved'&&!confirm('Approve and publish this business submission?'))return;review.disabled=true;try{const data=await post({action:'review-content',businessId:selected,submissionId:review.dataset.submissionId,decision:review.dataset.contentReview});alert(data.message);await openBusiness(selected)}catch(error){alert(error.message)}});

$("bam-workspace").addEventListener("click",async e=>{
  const upload=e.target.closest("[data-upload-resource-image]");

  if(upload){
    const itemId=upload.dataset.uploadResourceImage;

    const fileInput=$("bam-workspace").querySelector(
      `[data-resource-image-file="${itemId}"]`
    );

    const altInput=$("bam-workspace").querySelector(
      `[data-resource-image-alt="${itemId}"]`
    );

    const file=fileInput?.files?.[0];

    if(!file){
      alert("Choose a JPG, PNG or WebP image first.");
      return;
    }

    upload.disabled=true;

    try{
      const dataUrl=await prepareAdminImage(
        file,
        1600,
        .84
      );

      const data=await post({
        action:"upload-resource-image",
        businessId:selected,
        itemId,
        fileName:file.name,
        altText:
          altInput?.value?.trim() ||
          "Resource image",
        dataUrl
      });

      alert(
        data.message ||
        "Resource image uploaded."
      );

      await openBusiness(selected);
    }catch(error){
      alert(
        error.message ||
        "Resource image could not be uploaded."
      );
    }finally{
      upload.disabled=false;
    }

    return;
  }

  const remove=e.target.closest("[data-delete-resource-image]");

  if(remove){
    if(!confirm("Remove this image from the resource?")){
      return;
    }

    remove.disabled=true;

    try{
      const data=await post({
        action:"delete-resource-image",
        businessId:selected,
        itemId:remove.dataset.resourceId,
        imageId:remove.dataset.deleteResourceImage
      });

      alert(data.message||"Resource image removed.");
      await openBusiness(selected);
    }catch(error){
      alert(error.message);
    }finally{
      remove.disabled=false;
    }
  }
});

openExistingSession();
})();
