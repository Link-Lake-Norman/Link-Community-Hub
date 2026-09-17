const state={data:null};const mainUrl='https://www.linkcommunityhub.com';const qs=(s,r=document)=>r.querySelector(s);const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');const date=v=>v?new Date(v).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(c||0)/100);
function status(m,t=''){const n=qs('#globalStatus');n.className=`global-status ${t}`.trim();n.textContent=m||'';}
async function api(url,options={}){const r=await fetch(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});let d={};try{d=await r.json();}catch{}if(r.status===401){location.href='/business/';throw new Error('Session expired.');}if(!r.ok)throw new Error(d.error||'LINK request failed.');return d;}
function view(name){qsa('.view').forEach(s=>s.classList.toggle('active',s.id===`view-${name}`));qsa('.nav-button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));scrollTo({top:0,behavior:'smooth'});}qsa('.nav-button').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));qsa('[data-go-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.goView)));
const metric=(l,v)=>`<article class="metric"><strong>${esc(v)}</strong><span>${esc(l)}</span></article>`;
function renderHeader(){const b=state.data.business;qs('#businessHeading').textContent=b.business_name;const label={community_free:'Resource Contributor — Free',community_business:'Community Business — Complimentary through Oct. 15; $150/year beginning Oct. 16',community_partner:'Community Ally',impact_partner:'Impact Partner',community_champion:'Community Champion',presenting_partner:'Presenting Partner'}[b.plan_tier]||'LINK Business';qs('#planBadge').textContent=b.status==='pending'?'Pending LINK Approval':label;if(b.status==='pending')status('Your account is private and pending LINK approval. You may complete your profile and prepare resources; nothing will appear publicly until approved.','');}
function renderMetrics(){
  const b=state.data.business||{};
  const isFree=
    !b.plan_tier||
    b.plan_tier==="community_free";

  const metricGrid=
    qs("#metricGrid");

  const impactMetricGrid=
    qs("#impactMetricGrid");

  const impactNav=
    qs('[data-view="impact"]');

  if(isFree){

    const locked=`
      <article class="business-impact-lock">
        <div class="panel-kicker">
          TIER 2+ FEATURE
        </div>

        <h3>
          See and measure your community impact.
        </h3>

        <p>
          Impact reporting is included with LINK
          Tier 2+ partnerships.
        </p>

        <div class="business-locked-benefits">
          <span>🔒 Resources contributed</span>
          <span>🔒 Nonprofits supported</span>
          <span>🔒 Completed connections</span>
          <span>🔒 Estimated community value</span>
          <span>🔒 Shareable impact reporting</span>
        </div>

        <a
          class="primary business-upgrade-button"
          href="/api/business/upgrade"
        >
          UNLOCK IMPACT REPORTING
        </a>
      </article>
    `;

    if(metricGrid){
      metricGrid.innerHTML=locked;
    }

    if(impactMetricGrid){
      impactMetricGrid.innerHTML=locked;
    }

    if(impactNav){
      impactNav.textContent=
        "Impact Reporting 🔒";
    }

    return;
  }

  if(impactNav){
    impactNav.textContent=
      "Impact";
  }

  const i=
    state.data.impact||{};

  const h=[
    metric(
      "Resources Posted",
      i.resources_posted||0
    ),
    metric(
      "Requests Received",
      i.requests_received||0
    ),
    metric(
      "Completed Connections",
      i.completed_connections||0
    ),
    metric(
      "Nonprofits Supported",
      i.nonprofits_supported||0
    )
  ].join("");

  if(metricGrid){
    metricGrid.innerHTML=h;
  }

  if(impactMetricGrid){
    impactMetricGrid.innerHTML=
      h+
      metric(
        "Tracked Estimated Value",
        money(
          i.estimated_value_cents||0
        )
      );
  }
}
function renderAttention(){const rows=[];state.data.requests.filter(r=>['requested','connected'].includes(r.status)).slice(0,3).forEach(r=>rows.push(`<div class="list-row"><strong>${esc(r.nonprofit_name)}</strong><span>Requested ${esc(r.item_title)} · ${esc(date(r.requested_at))}</span></div>`));qs('#attentionList').innerHTML=rows.join('')||'<div class="empty-state">Nothing needs your attention right now.</div>';}
function matchCard(m){const reasons=Array.isArray(m.match_reasons)?m.match_reasons.join(' · '):'';return `<article class="match-card"><h4>${esc(m.display_name)}</h4><p>${esc(m.mission||m.category||'Local nonprofit')}</p>${reasons?`<p><strong>Aligned with:</strong> ${esc(reasons)}</p>`:''}</article>`;}
function renderMatches(){const m=state.data.nonprofitMatches||[];qs('#matchList').innerHTML=m.map(matchCard).join('')||'<div class="empty-state">Choose your giving preferences to see mission-aligned nonprofits here.</div>';qs('#homeMatches').innerHTML=m.length?m.slice(0,3).map(x=>`<div class="list-row"><strong>${esc(x.display_name)}</strong><span>${esc(Array.isArray(x.match_reasons)?x.match_reasons.join(' · '):x.category||'Mission alignment')}</span></div>`).join(''):'<div class="empty-state">Add your giving preferences to improve matches.</div>';}
function resourceCard(item){const photo=item.images?.[0]?.image_url||item.image_url||'';const strip=(item.images||[]).map(img=>`<div class="photo-thumb"><img src="${esc(img.image_url)}" alt="${esc(img.alt_text||item.title)}"><button type="button" data-delete-image="${esc(img.id)}">×</button></div>`).join('');return `<article class="resource-card">${photo?`<img class="resource-photo" src="${esc(photo)}" alt="${esc(item.title)}" loading="lazy">`:'<div class="resource-photo"></div>'}<div class="resource-body"><div class="resource-top"><div><h3>${esc(item.title)}</h3><p class="resource-description">${esc(item.category||'Resource')}</p></div><span class="badge ${esc(item.status)}">${esc(item.status)}</span></div>${item.description?`<p class="resource-description">${esc(item.description)}</p>`:''}${strip?`<div class="photo-strip">${strip}</div>`:''}<div class="resource-actions"><button type="button" data-edit-resource="${esc(item.id)}">Edit</button><label class="upload-button">Add Photos (up to 3)<input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-resource-photo="${esc(item.id)}"></label>${item.status==='available'?`<button type="button" data-resource-status="${esc(item.id)}" data-status="paused">Pause</button>`:item.status==='paused'?`<button type="button" data-resource-status="${esc(item.id)}" data-status="available">Make Available</button>`:''}${item.status!=='removed'?`<button type="button" data-resource-status="${esc(item.id)}" data-status="removed">Remove</button>`:''}</div></div></article>`;}
function wireResourceActions(){qsa('[data-edit-resource]').forEach(b=>b.onclick=()=>openResourceModal(state.data.resources.find(r=>r.id===b.dataset.editResource)));qsa('[data-resource-status]').forEach(b=>b.onclick=async()=>{try{await api('/api/business/resource',{method:'PATCH',body:JSON.stringify({action:'status',itemId:b.dataset.resourceStatus,status:b.dataset.status})});await loadDashboard();status('Resource updated.','success');}catch(e){status(e.message,'error');}});qsa('[data-resource-photo]').forEach(input=>input.onchange=async()=>{
  const selected=Array.from(input.files||[]);
  if(!selected.length)return;

  const item=state.data.resources.find(
    row=>row.id===input.dataset.resourcePhoto
  );

  const existing=Array.isArray(item?.images)
    ? item.images.length
    : 0;

  const remaining=Math.max(
    0,
    3-existing
  );

  if(!remaining){
    status(
      'This resource already has 3 images. Remove one before adding another.',
      'error'
    );
    input.value='';
    return;
  }

  if(selected.length>remaining){
    status(
      `You may add ${remaining} more ${remaining===1?'image':'images'} to this resource.`,
      'error'
    );
    input.value='';
    return;
  }

  let uploaded=0;

  try{
    for(
      let index=0;
      index<selected.length;
      index+=1
    ){
      const file=selected[index];

      status(
        `Preparing resource image ${index+1} of ${selected.length}…`
      );

      await api(
        '/api/business/upload',
        {
          method:'POST',
          body:JSON.stringify({
            kind:'resource',
            itemId:input.dataset.resourcePhoto,
            dataUrl:await prepareImage(
              file,
              1600,
              .82
            )
          })
        }
      );

      uploaded+=1;
    }

    await loadDashboard();

    status(
      uploaded===1
        ? '1 resource image uploaded.'
        : `${uploaded} resource images uploaded.`,
      'success'
    );

  }catch(e){
    await loadDashboard().catch(()=>{});

    status(
      (
        uploaded
          ? `${uploaded} uploaded successfully. `
          : ''
      ) + e.message,
      'error'
    );

  }finally{
    input.value='';
  }
});

qsa('[data-delete-image]').forEach(b=>b.onclick=async()=>{try{await api('/api/business/upload',{method:'POST',body:JSON.stringify({action:'delete-image',imageId:b.dataset.deleteImage})});await loadDashboard();status('Resource image removed.','success');}catch(e){status(e.message,'error');}});}
function renderResources(){qs('#resourceList').innerHTML=state.data.resources.map(resourceCard).join('')||'<div class="empty-state">No resources posted yet. Add your first available resource.</div>';wireResourceActions();}
function requestCard(r){const actions=['requested','connected'].includes(r.status)?`<div class="resource-actions">${r.status==='requested'?`<button type="button" data-request-action="${esc(r.id)}" data-action="connected">Connect</button>`:''}<button type="button" data-request-action="${esc(r.id)}" data-action="completed">Mark Completed</button><button type="button" data-request-action="${esc(r.id)}" data-action="declined">Decline</button></div>`:'';return `<article class="request-card"><div class="request-top"><div><h3>${esc(r.nonprofit_name)}</h3><p>${esc(r.item_title)}</p></div><span class="badge ${esc(r.status)}">${esc(r.status)}</span></div><p><strong>${esc(r.nonprofit_contact_name)}</strong><br>${esc(r.nonprofit_contact_email)}</p>${r.message?`<p>${esc(r.message)}</p>`:''}<p>Requested ${esc(date(r.requested_at))}</p>${actions}</article>`;}
function renderRequests(){qs('#requestList').innerHTML=state.data.requests.map(requestCard).join('')||'<div class="empty-state">No nonprofit requests yet.</div>';qsa('[data-request-action]').forEach(b=>b.onclick=async()=>{const note=b.dataset.action==='declined'?(prompt('Optional note for this request:','')||''):'';try{await api('/api/business/request-action',{method:'POST',body:JSON.stringify({requestId:b.dataset.requestAction,action:b.dataset.action,note})});await loadDashboard();status('Request updated.','success');}catch(e){status(e.message,'error');}});}

function renderDownloads(){
  const downloads=state.data.downloads||{};
  const assets=Array.isArray(downloads.sharedAssets)?downloads.sharedAssets:[];
  const contracts=Array.isArray(downloads.contracts)?downloads.contracts:[];

  qs('#sharedDownloadList').innerHTML=
    assets.map(asset=>{
      const price=asset.price_cents!=null
        ? ` · ${money(asset.price_cents)}`
        : '';
      const note=asset.price_note
        ? ` · ${esc(asset.price_note)}`
        : '';
      const action=asset.destination_url
        ? `<a class="secondary inline-link" href="${esc(asset.destination_url)}" target="_blank" rel="noopener noreferrer">Open</a>`
        : '';
      return `<div class="list-row">
        <strong>${esc(asset.asset_name)}</strong>
        <span>${esc(asset.description||asset.asset_type||'LINK member resource')}${price}${note}</span>
        ${action}
      </div>`;
    }).join('')
    || '<div class="empty-state">No LINK member downloads are available yet.</div>';

  qs('#contractDownloadList').innerHTML=
    contracts.map(file=>`<div class="list-row">
      <strong>${esc(file.title)}</strong>
      <span>${esc(file.file_name)}${file.signed_at?` · Signed ${esc(date(file.signed_at))}`:''}</span>
      <button class="secondary" type="button"
        data-business-contract="${esc(file.id)}"
        data-business-contract-name="${esc(file.file_name)}">
        Download Contract
      </button>
    </div>`).join('')
    || '<div class="empty-state">No contract has been shared with this business account.</div>';

  qsa('[data-business-contract]').forEach(button=>{
    button.onclick=async()=>{
      button.disabled=true;
      try{
        const response=await fetch(
          `/api/business/file?id=${encodeURIComponent(button.dataset.businessContract)}`,
          {credentials:'same-origin'}
        );

        if(response.status===401){
          location.href='/business/';
          return;
        }

        if(!response.ok){
          const result=await response.json().catch(()=>({}));
          throw new Error(result.error||'Contract could not be opened.');
        }

        const blob=await response.blob();
        const url=URL.createObjectURL(blob);
        const link=document.createElement('a');
        link.href=url;
        link.download=
          button.dataset.businessContractName||
          'link-business-contract';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(error){
        status(error.message,'error');
      }finally{
        button.disabled=false;
      }
    };
  });
}
function renderSettings(){
  const b=
    state.data.business||{};

  const isFree=
    !b.plan_tier||
    b.plan_tier==="community_free";

  qs("#profileBusinessName").value=
    b.business_name||"";

  qs("#profileContactName").value=
    b.contact_name||"";

  qs("#profilePhone").value=
    b.phone||"";

  qs("#profileWebsite").value=
    b.website_url||"";

  qs("#profileDescription").value=
    b.description||"";

  qs("#profileAddressLine1").value=
    b.address_line1||"";

  qs("#profileAddressLine2").value=
    b.address_line2||"";

  qs("#profileCity").value=
    b.city||"";

  qs("#profileState").value=
    b.state||"NC";

  qs("#profilePostalCode").value=
    b.postal_code||"";

  const claimWindow=
    qs("#claimWindowMonths");

  if(claimWindow){
    claimWindow.value="12";
    claimWindow.disabled=true;
  }

  const publicProfile=
    qs("#publicProfileEnabled");

  const publicControl=
    qs("#businessPaidPublicProfileControl");

  const publicTitle=
    qs("#businessPublicVisibilityTitle");

  const publicCopy=
    qs("#businessPublicVisibilityCopy");

  if(isFree){

    if(publicProfile){
      publicProfile.checked=false;
      publicProfile.disabled=true;
    }

    if(publicControl){
      publicControl.classList.add("hidden");
    }

    if(publicTitle){
      publicTitle.textContent=
        "Public visibility is a paid partnership benefit.";
    }

    if(publicCopy){
      publicCopy.innerHTML=`
        <strong>Community Business — Complimentary through Oct. 15; $150/year beginning Oct. 16</strong>
        lets your business participate privately
        inside LINK.

        <br><br>

        Upgrade to Tier 2+ to unlock eligible
        public business visibility beginning
        <strong>October 10</strong>.
      `;
    }

  }else{

    if(publicControl){
      publicControl.classList.remove("hidden");
    }

    if(publicProfile){
      publicProfile.disabled=false;
      publicProfile.checked=
        b.public_profile_enabled===true;
    }

    if(publicTitle){
      publicTitle.textContent=
        "Your paid partnership includes public-visibility eligibility.";
    }

    if(publicCopy){
      publicCopy.innerHTML=`
        LINK public business visibility launches
        <strong>October 10</strong>.

        Complete your logo, profile and visibility
        settings now so your business is ready.
      `;
    }
  }

  qs("#leaderboardOptIn").checked=
    b.leaderboard_opt_in===true;

  qs("#leaderboardDisplayName").value=
    b.leaderboard_display_name||"";

  qs("#logoPreview").innerHTML=
    b.logo_url
      ? `
          <img
            src="${esc(b.logo_url)}"
            alt="${esc(b.business_name)} logo"
          >
        `
      : "LOGO";

  const selected=
    new Set(
      (state.data.selectedMissionTags||[])
        .map(t=>t.code)
    );

  qs("#missionTagGrid").innerHTML=
    (state.data.missionTags||[])
      .map(t=>`
        <label class="tag-option">
          <input
            type="checkbox"
            value="${esc(t.code)}"
            ${selected.has(t.code)?"checked":""}
          >

          <span>
            ${esc(t.label)}
          </span>
        </label>
      `)
      .join("");

  renderBusinessLaunchOffer();
}

function renderBusinessLaunchOffer(){

  const b=
    state.data.business||{};

  const isFree=
    !b.plan_tier||
    b.plan_tier==="community_free";

  const launch=
    new Date(
      "2026-10-10T00:00:00-04:00"
    );

  const now=
    new Date();

  const beforeLaunch=
    now.getTime()<
    launch.getTime();

  const remaining=
    Math.max(
      0,
      launch.getTime()-now.getTime()
    );

  const days=
    Math.ceil(
      remaining/
      86400000
    );

  let host=
    document.getElementById(
      "businessLaunchOffer"
    );

  if(!host){

    host=
      document.createElement(
        "section"
      );

    host.id=
      "businessLaunchOffer";

    host.className=
      "business-launch-offer";

    const main=
      document.querySelector(
        "main"
      );

    const firstView=
      main?.querySelector(
        ".view"
      );

    if(
      firstView &&
      firstView.parentNode
    ){
      firstView.parentNode.insertBefore(
        host,
        firstView
      );
    }else{
      main?.prepend(host);
    }
  }

  if(isFree){

    host.innerHTML=`
      <div class="business-launch-badge">
        PUBLIC BUSINESS EXPERIENCE
        · OCTOBER 10
      </div>

      <h2>
        You're already participating.
        The next step is being seen.
      </h2>

      <p class="business-launch-lead">
        Your Community Business account
        gives you access to participate inside
        LINK. Public visibility, impact reporting
        and expanded promotion are paid
        partnership benefits.
      </p>

      <div class="business-plan-compare">

        <article>
          <div class="business-plan-name">
            COMMUNITY BUSINESS
          </div>

          <div class="business-plan-price">
            FREE
          </div>

          <span>✓ Private business portal</span>
          <span>✓ Resource Exchange participation</span>
          <span>✓ Post resources and offers</span>
          <span>✓ Receive nonprofit requests</span>
          <span>✓ View local needs and matches</span>

          <span class="locked">
            🔒 Public business profile
          </span>

          <span class="locked">
            🔒 Public logo visibility
          </span>

          <span class="locked">
            🔒 Impact reporting
          </span>

          <span class="locked">
            🔒 Public promotion
          </span>
        </article>

        <article class="paid">

          <div class="business-plan-name">
            TIER 2+
          </div>

          <div class="business-plan-price">
            GET SEEN + MEASURE IMPACT
          </div>

          <span>
            ✓ Public business visibility
            after launch
          </span>

          <span>
            ✓ Public business profile
          </span>

          <span>
            ✓ Logo + brand recognition
          </span>

          <span>
            ✓ Community Partner visibility
          </span>

          <span>
            ✓ Impact reporting
          </span>

          <span>
            ✓ Estimated value tracking
          </span>

          <span>
            ✓ Nonprofits supported
          </span>

          <span>
            ✓ Expanded promotional
            opportunities
          </span>
        </article>

      </div>

      ${
        beforeLaunch
          ? `
            <div class="business-early-offer">

              <div>
                <strong>
                  EARLY PARTNER OFFER
                </strong>

                <span>
                  Upgrade to Tier 2+ before
                  October 10 and save
                  <strong>10% on your first year.</strong>
                </span>
              </div>

              <div class="business-countdown">
                <strong>
                  ${days}
                </strong>

                <span>
                  DAY${days===1?"":"S"}
                  TO PUBLIC LAUNCH
                </span>
              </div>

            </div>

            <a
              class="primary business-upgrade-button"
              href="/api/business/upgrade"
            >
              UPGRADE + SAVE 10%
            </a>
          `
          : `
            <div class="business-early-offer">
              <div>
                <strong>
                  PUBLIC BUSINESS VISIBILITY IS LIVE
                </strong>

                <span>
                  Upgrade to Tier 2+ to unlock
                  eligible public LINK business
                  visibility and impact reporting.
                </span>
              </div>
            </div>

            <a
              class="primary business-upgrade-button"
              href="/api/business/upgrade"
            >
              VIEW TIER 2+ OPTIONS
            </a>
          `
      }
    `;

    return;
  }

  host.innerHTML=`
    <div class="business-launch-badge">
      TIER 2+ PARTNER
    </div>

    <h2>
      ${
        beforeLaunch
          ? "You're preparing for LINK public business launch."
          : "Your business is eligible for LINK public visibility."
      }
    </h2>

    <p class="business-launch-lead">
      ${
        beforeLaunch
          ? `
              Public business visibility launches
              <strong>October 10</strong>.
              Complete your business profile,
              logo and visibility settings now.
            `
          : `
              Your active paid partnership includes
              public-visibility eligibility and
              impact reporting according to your
              LINK partnership level.
            `
      }
    </p>
  `;
}

function renderAll(){renderHeader();renderMetrics();renderAttention();renderMatches();renderResources();renderRequests();renderDownloads();renderSettings();}
async function loadDashboard(){state.data=await api('/api/business/dashboard');renderAll();}
const modal=qs('#resourceModal');function openResourceModal(item=null){qs('#resourceModalTitle').textContent=item?'Edit Resource':'Add Resource';qs('#resourceId').value=item?.id||'';qs('#resourceTitle').value=item?.title||'';qs('#resourceCategory').value=item?.category||'';qs('#resourceDescription').value=item?.description||'';qs('#resourceQuantity').value=item?.quantity_text||'';qs('#resourceValue').value=item?.estimated_value_cents?(Number(item.estimated_value_cents)/100).toFixed(2):'';qs('#resourceAvailability').value=item?.availability_notes||'';qs('#resourcePickup').value=item?.pickup_instructions||'';qs('#resourceExpires').value=item?.expires_at?new Date(new Date(item.expires_at).getTime()-new Date(item.expires_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'';qs('#resourceConnectorAcknowledged').checked=false;modal.classList.add('open');modal.setAttribute('aria-hidden','false');}function closeResourceModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
qsa('[data-open-resource]').forEach(b=>b.onclick=()=>openResourceModal());qs('#closeResourceModal').onclick=closeResourceModal;qs('#cancelResourceButton').onclick=closeResourceModal;modal.onclick=e=>{if(e.target===modal)closeResourceModal();};
qs('#resourceForm').onsubmit=async e=>{e.preventDefault();const id=qs('#resourceId').value,o=qs('#resourceStatus');o.textContent='Saving resource…';try{await api('/api/business/resource',{method:id?'PATCH':'POST',body:JSON.stringify({action:id?'update':'create',itemId:id||undefined,title:qs('#resourceTitle').value,category:qs('#resourceCategory').value,description:qs('#resourceDescription').value,quantityText:qs('#resourceQuantity').value,estimatedValue:qs('#resourceValue').value,availabilityNotes:qs('#resourceAvailability').value,pickupInstructions:qs('#resourcePickup').value,expiresAt:qs('#resourceExpires').value?new Date(qs('#resourceExpires').value).toISOString():null,connectorAcknowledged:qs('#resourceConnectorAcknowledged').checked})});await loadDashboard();o.className='status success';o.textContent='Resource saved.';setTimeout(closeResourceModal,350);}catch(err){o.className='status error';o.textContent=err.message;}};
qs('#profileForm').onsubmit=async e=>{e.preventDefault();const o=qs('#profileStatus');o.textContent='Saving…';try{await api('/api/business/profile',{method:'POST',body:JSON.stringify({businessName:qs('#profileBusinessName').value,contactName:qs('#profileContactName').value,phone:qs('#profilePhone').value,website:qs('#profileWebsite').value,description:qs('#profileDescription').value,addressLine1:qs('#profileAddressLine1').value,addressLine2:qs('#profileAddressLine2').value,city:qs('#profileCity').value,state:qs('#profileState').value,postalCode:qs('#profilePostalCode').value,claimWindowMonths:12,publicProfileEnabled:(state.data.business?.plan_tier!=="community_free"&&qs("#publicProfileEnabled")?.checked===true),leaderboardOptIn:qs('#leaderboardOptIn').checked,leaderboardDisplayName:qs('#leaderboardDisplayName').value})});await loadDashboard();o.className='status success';o.textContent='Business profile, address and description saved.';}catch(err){o.className='status error';o.textContent=err.message;}};
qs('#preferenceForm').onsubmit=async e=>{e.preventDefault();const o=qs('#preferenceStatus'),missionCodes=qsa('#missionTagGrid input:checked').map(i=>i.value);try{await api('/api/business/preferences',{method:'POST',body:JSON.stringify({missionCodes})});await loadDashboard();o.className='status success';o.textContent='Giving preferences saved.';}catch(err){o.className='status error';o.textContent=err.message;}};
qs('#logoInput').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{status('Preparing business logo…');await api('/api/business/upload',{method:'POST',body:JSON.stringify({kind:'logo',dataUrl:await prepareImage(file,900,.9)})});await loadDashboard();status('Business logo uploaded.','success');}catch(err){status(err.message,'error');}finally{e.target.value='';}};
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});}async function prepareImage(file,maxDimension,quality){if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use a PNG, JPG or WebP image.');const image=await loadImage(await fileToDataUrl(file)),scale=Math.min(1,maxDimension/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d',{alpha:true}).drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',quality);}
async function recordShare(channel,audienceType){try{await api('/api/business/share',{method:'POST',body:JSON.stringify({channel,audienceType})});}catch(e){console.warn(e);}}
qs('#copyShareButton').onclick=async()=>{try{await navigator.clipboard.writeText(mainUrl);await recordShare('copy-link',qs('#shareAudience').value);status('LINK site link copied.','success');}catch{status('Copy failed. Share www.linkcommunityhub.com directly.','error');}};qs('#nativeShareButton').onclick=async()=>{const audience=qs('#shareAudience').value,text='Take a look at LINK Community Hub™ — a Lake Norman community ecosystem connecting local needs, nonprofits, businesses, schools, volunteers, resources and opportunities.';if(navigator.share){try{await navigator.share({title:'LINK Community Hub™',text,url:mainUrl});await recordShare('native-share',audience);}catch{}return;}try{await navigator.clipboard.writeText(`${text} ${mainUrl}`);await recordShare('copy-link',audience);status('Share message copied.','success');}catch{status('Share is not available in this browser.','error');}};
qs('#inviteForm').onsubmit=async e=>{e.preventDefault();const o=qs('#inviteStatus');o.textContent='Sending invitation…';try{await api('/api/business/invite',{method:'POST',body:JSON.stringify({inviteeName:qs('#inviteeName').value,inviteeEmail:qs('#inviteeEmail').value,audienceType:qs('#inviteAudience').value})});o.className='status success';o.textContent='Invitation sent.';e.target.reset();}catch(err){o.className='status error';o.textContent=err.message;}};
qs('#logoutButton').onclick=async()=>{try{await api('/api/business/auth/logout',{method:'POST',body:'{}'});}catch{}location.href='/business/';};loadDashboard().catch(e=>status(e.message,'error'));
function installCompleteBusinessProfileFields(){
  const website=document.getElementById('profileWebsite');
  if(!website||document.getElementById('profileDescription'))return;
  const holder=document.createElement('div');
  holder.className='complete-profile-fields';
  holder.innerHTML='<label class="wide">Business description<textarea id="profileDescription" maxlength="3000" rows="4" placeholder="Describe your business, services and community connection."></textarea></label><label>Street address<input id="profileAddressLine1" maxlength="300"></label><label>Suite / unit<input id="profileAddressLine2" maxlength="300"></label><label>City<input id="profileCity" maxlength="120"></label><label>State<input id="profileState" maxlength="40" value="NC"></label><label>ZIP<input id="profilePostalCode" maxlength="20"></label>';
  website.closest('label').after(holder);
}
installCompleteBusinessProfileFields();
