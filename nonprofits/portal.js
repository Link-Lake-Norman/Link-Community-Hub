const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let data;
async function api(url,o={}){const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(o.headers||{})},...o});const j=await r.json().catch(()=>({}));if(r.status===401){location.href='/nonprofits/';throw new Error('Please sign in.');}if(!r.ok)throw new Error(j.error||'Request failed.');return j;}
function fileData(f){return new Promise((a,b)=>{const r=new FileReader();r.onload=()=>a(r.result);r.onerror=b;r.readAsDataURL(f)});}async function shrink(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPG or WebP.');const src=await fileData(file),img=await new Promise((a,b)=>{const i=new Image;i.onload=()=>a(i);i.onerror=b;i.src=src}),scale=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/webp',.84);}
function render(){ $('#heading').textContent=data.organization.display_name;$('#photos').innerHTML=(data.assets||[]).filter(a=>a.asset_type==='photo').map(a=>`<article class="panel photo-card"><img src="${esc(a.storage_url)}" alt="${esc(a.alt_text||a.caption||'Community photo')}"><h3>${esc(a.story_title||a.caption||'Community photo')}</h3><p>${esc(a.story_text||'')}</p><p><strong>Status:</strong> ${a.approved?'Approved':'Pending LINK approval'}</p><p>Website: ${a.public_site_allowed?'Allowed':'No'} · Community Brief: ${a.newsletter_allowed?'Allowed':'No'}</p></article>`).join('')||'<div class="empty-state">No photos uploaded yet.</div>';$('#serviceList').innerHTML=(data.services||[]).map(s=>`<article class="resource-card"><div>${s.business_logo_url?`<img src="${esc(s.business_logo_url)}" alt="${esc(s.business_name)} logo" style="max-width:120px;max-height:55px">`:''}<div class="panel-kicker">${esc(s.category)}</div><h3>${esc(s.title)}</h3><p><strong>${esc(s.business_name)}</strong></p><p>${esc(s.description)}</p>${s.nonprofit_discount_note?`<p><strong>Nonprofit offering:</strong> ${esc(s.nonprofit_discount_note)}</p>`:''}${s.pro_bono_available?'<p><strong>Pro bono may be available.</strong></p>':''}<button class="primary" data-service="${esc(s.id)}">Request Introduction</button></div></article>`).join('')||'<div class="empty-state">No service partners are listed yet.</div>';$$('[data-service]').forEach(b=>b.onclick=async()=>{const m=prompt('What would you like the business to know about your need?','');if(m===null)return;try{const j=await api('/api/services/inquire',{method:'POST',body:JSON.stringify({serviceId:b.dataset.service,message:m})});alert(j.message);}catch(e){alert(e.message);}})}
async function load(){data=await api('/api/nonprofits/portal/dashboard');render();}
$('#photoForm').onsubmit=async e=>{e.preventDefault();const s=$('#photoStatus'),f=$('#photo').files[0];try{s.textContent='Preparing photo…';const j=await api('/api/nonprofits/media/upload',{method:'POST',body:JSON.stringify({fileName:f.name,dataUrl:await shrink(f),caption:$('#caption').value,storyTitle:$('#storyTitle').value,storyText:$('#storyText').value,photoCredit:$('#photoCredit').value,altText:$('#altText').value,authorizationConfirmed:$('#auth').checked,publicSiteAllowed:$('#publicSite').checked,newsletterAllowed:$('#newsletter').checked,minorsPresent:$('#minors').checked,minorsConsentConfirmed:$('#minorConsent').checked})});s.className='status success';s.textContent=j.message;e.target.reset();await load();}catch(x){s.className='status error';s.textContent=x.message;}};
$$('.nav-button').forEach(b=>b.onclick=()=>{$$('.nav-button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active'));$('#'+b.dataset.v).classList.add('active')});$('#logout').onclick=async()=>{try{await api('/api/nonprofits/portal/auth/logout',{method:'POST',body:'{}'})}catch{}location.href='/nonprofits/'};load().catch(e=>$('#global').textContent=e.message);


/* =========================================================
   LINK NONPROFIT EVENTS
   ========================================================= */

let linkEvents = [];


function eventEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function eventDate(value) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


function eventLocalInput(value) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const offset =
    d.getTimezoneOffset() * 60000;

  return new Date(
    d.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}


async function eventApi(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        credentials: "same-origin",

        headers: {
          "Content-Type":
            "application/json",

          ...(options.headers || {})
        },

        ...options
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      "LINK request failed."
    );
  }

  return data;
}


async function eventImageData(file) {

  if (!file) {
    throw new Error(
      "Choose a flyer image."
    );
  }

  if (
    typeof shrink ===
    "function"
  ) {
    return await shrink(file);
  }

  return await new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(
          reader.result
        );

      reader.onerror =
        () => reject(
          new Error(
            "Flyer could not be read."
          )
        );

      reader.readAsDataURL(
        file
      );
    }
  );
}


function eventLocation(event) {

  const parts = [
    event.location_name,
    event.address_line1,
    event.city,
    event.state,
    event.postal_code
  ].filter(Boolean);

  return parts.join(" · ");
}


function eventCard(event) {

  const flyer =
    event.flyers?.[0];

  const status =
    event.status ||
    "pending-review";

  const past =
    new Date(
      event.ends_at ||
      event.starts_at
    ) < new Date();

  return `
    <article
      class="panel event-card"
      data-event-card="${eventEsc(event.id)}"
    >

      ${
        flyer?.storage_url

        ? `
          <img
            class="event-card-flyer"
            src="${eventEsc(flyer.storage_url)}"
            alt="${eventEsc(
              flyer.alt_text ||
              event.title + " flyer"
            )}"
            loading="lazy"
          >
        `

        : ""
      }

      <div class="panel-kicker">
        ${
          past
            ? "PAST EVENT"
            : eventEsc(
                event.category ||
                "COMMUNITY EVENT"
              )
        }
      </div>

      <h3>
        ${eventEsc(event.title)}
      </h3>

      <div class="event-meta">

        <strong>
          ${eventEsc(
            eventDate(
              event.starts_at
            )
          )}
        </strong>

        ${
          event.ends_at

            ? `
              <br>
              Ends:
              ${eventEsc(
                eventDate(
                  event.ends_at
                )
              )}
            `

            : ""
        }

        ${
          eventLocation(event)

            ? `
              <br>
              ${eventEsc(
                eventLocation(event)
              )}
            `

            : ""
        }

      </div>

      ${
        event.description

        ? `
          <p class="panel-copy">
            ${eventEsc(
              event.description
            )}
          </p>
        `

        : ""
      }

      <div class="event-status-row">

        <span
          class="event-status-pill ${eventEsc(status)}"
        >
          ${eventEsc(
            status.replaceAll(
              "-",
              " "
            )
          )}
        </span>

        ${
          flyer

            ? `
              <span class="badge">
                Flyer:
                ${
                  flyer.approved
                    ? "Approved"
                    : "Pending"
                }
              </span>
            `

            : ""
        }

      </div>


      ${
        event.event_url

        ? `
          <a
            class="inline-link"
            href="${eventEsc(event.event_url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Event Link →
          </a>
        `

        : ""
      }


      <div class="event-actions">

        <button
          class="secondary"
          type="button"
          data-edit-event="${eventEsc(event.id)}"
        >
          Edit
        </button>


        <label class="upload-button flyer-upload">

          ${
            flyer
              ? "Replace Flyer"
              : "Add Flyer"
          }

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            data-event-flyer="${eventEsc(event.id)}"
          >

        </label>


        <button
          class="secondary"
          type="button"
          data-remove-event="${eventEsc(event.id)}"
        >
          Remove
        </button>

      </div>

    </article>
  `;
}


function renderEvents() {

  const container =
    document.querySelector(
      "#eventList"
    );

  if (!container) {
    return;
  }

  if (!linkEvents.length) {

    container.innerHTML =
      `
        <div class="empty-state">
          No events have been added yet.
          Add your next fundraiser,
          volunteer day or community event.
        </div>
      `;

    return;
  }

  container.innerHTML =
    linkEvents
      .map(eventCard)
      .join("");

  wireEventActions();
}


function resetEventForm() {

  const form =
    document.querySelector(
      "#eventForm"
    );

  if (!form) return;

  form.reset();

  document.querySelector(
    "#eventId"
  ).value = "";

  document.querySelector(
    "#eventState"
  ).value = "NC";

  document.querySelector(
    "#eventEditorTitle"
  ).textContent =
    "Add Community Event";

  document.querySelector(
    "#eventStatus"
  ).textContent = "";
}


function openEventEditor(event = null) {

  const editor =
    document.querySelector(
      "#eventEditor"
    );

  if (!editor) return;

  resetEventForm();

  editor.classList.remove(
    "hidden"
  );

  if (event) {

    document.querySelector(
      "#eventEditorTitle"
    ).textContent =
      "Edit Community Event";

    document.querySelector(
      "#eventId"
    ).value =
      event.id || "";

    document.querySelector(
      "#eventTitle"
    ).value =
      event.title || "";

    document.querySelector(
      "#eventCategory"
    ).value =
      event.category || "";

    document.querySelector(
      "#eventDescription"
    ).value =
      event.description || "";

    document.querySelector(
      "#eventStartsAt"
    ).value =
      eventLocalInput(
        event.starts_at
      );

    document.querySelector(
      "#eventEndsAt"
    ).value =
      eventLocalInput(
        event.ends_at
      );

    document.querySelector(
      "#eventUrl"
    ).value =
      event.event_url || "";

    document.querySelector(
      "#eventLocationName"
    ).value =
      event.location_name || "";

    document.querySelector(
      "#eventAddress"
    ).value =
      event.address_line1 || "";

    document.querySelector(
      "#eventCity"
    ).value =
      event.city || "";

    document.querySelector(
      "#eventState"
    ).value =
      event.state || "NC";

    document.querySelector(
      "#eventPostalCode"
    ).value =
      event.postal_code || "";
  }

  editor.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function closeEventEditor() {

  const editor =
    document.querySelector(
      "#eventEditor"
    );

  if (!editor) return;

  editor.classList.add(
    "hidden"
  );

  resetEventForm();
}


async function loadEvents() {

  try {

    const result =
      await eventApi(
        "/api/nonprofits/portal/events"
      );

    linkEvents =
      result.events || [];

    renderEvents();

  } catch (error) {

    const container =
      document.querySelector(
        "#eventList"
      );

    if (container) {
      container.innerHTML =
        `
          <div class="empty-state">
            ${eventEsc(
              error.message
            )}
          </div>
        `;
    }
  }
}


async function saveEvent(event) {

  event.preventDefault();

  const status =
    document.querySelector(
      "#eventStatus"
    );

  status.className =
    "status";

  status.textContent =
    "Saving event…";


  const eventId =
    document.querySelector(
      "#eventId"
    ).value;


  const body = {

    eventId,

    title:
      document.querySelector(
        "#eventTitle"
      ).value,

    category:
      document.querySelector(
        "#eventCategory"
      ).value,

    description:
      document.querySelector(
        "#eventDescription"
      ).value,

    startsAt:
      document.querySelector(
        "#eventStartsAt"
      ).value,

    endsAt:
      document.querySelector(
        "#eventEndsAt"
      ).value,

    eventUrl:
      document.querySelector(
        "#eventUrl"
      ).value,

    locationName:
      document.querySelector(
        "#eventLocationName"
      ).value,

    addressLine1:
      document.querySelector(
        "#eventAddress"
      ).value,

    city:
      document.querySelector(
        "#eventCity"
      ).value,

    state:
      document.querySelector(
        "#eventState"
      ).value,

    postalCode:
      document.querySelector(
        "#eventPostalCode"
      ).value
  };


  try {

    const result =
      await eventApi(
        "/api/nonprofits/portal/events",
        {
          method:
            eventId
              ? "PATCH"
              : "POST",

          body:
            JSON.stringify(
              body
            )
        }
      );

    status.className =
      "status success";

    status.textContent =
      result.message;

    await loadEvents();

    setTimeout(
      closeEventEditor,
      700
    );

  } catch (error) {

    status.className =
      "status error";

    status.textContent =
      error.message;
  }
}


async function uploadEventFlyer(
  input
) {

  const file =
    input.files?.[0];

  if (!file) return;


  const eventId =
    input.dataset.eventFlyer;


  try {

    const dataUrl =
      await eventImageData(
        file
      );

    await eventApi(
      "/api/nonprofits/portal/event-flyer",
      {
        method: "POST",

        body:
          JSON.stringify({
            eventId,
            fileName:
              file.name,
            dataUrl,
            altText:
              "Event flyer",
            authorizationConfirmed:
              true,
            newsletterAllowed:
              true,
            minorsPresent:
              false,
            minorsConsentConfirmed:
              false
          })
      }
    );

    await loadEvents();

    alert(
      "Flyer uploaded for LINK approval."
    );

  } catch (error) {

    alert(
      error.message
    );

  } finally {

    input.value = "";
  }
}


function wireEventActions() {

  document
    .querySelectorAll(
      "[data-edit-event]"
    )
    .forEach(button => {

      button.onclick =
        () => {

          const event =
            linkEvents.find(
              item =>
                item.id ===
                button.dataset.editEvent
            );

          if (event) {
            openEventEditor(
              event
            );
          }
        };
    });


  document
    .querySelectorAll(
      "[data-event-flyer]"
    )
    .forEach(input => {

      input.onchange =
        () =>
          uploadEventFlyer(
            input
          );
    });


  document
    .querySelectorAll(
      "[data-remove-event]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const event =
            linkEvents.find(
              item =>
                item.id ===
                button.dataset.removeEvent
            );

          if (!event) return;

          if (
            !confirm(
              `Remove "${event.title}" from LINK?`
            )
          ) {
            return;
          }

          try {

            await eventApi(
              "/api/nonprofits/portal/events",
              {
                method:
                  "DELETE",

                body:
                  JSON.stringify({
                    eventId:
                      event.id
                  })
              }
            );

            await loadEvents();

          } catch (error) {

            alert(
              error.message
            );
          }
        };
    });
}


function wireLinkEvents() {

  const add =
    document.querySelector(
      "#newEventButton"
    );

  if (add) {
    add.onclick =
      () =>
        openEventEditor();
  }


  const cancel =
    document.querySelector(
      "#cancelEventButton"
    );

  if (cancel) {
    cancel.onclick =
      closeEventEditor;
  }


  const form =
    document.querySelector(
      "#eventForm"
    );

  if (form) {
    form.onsubmit =
      saveEvent;
  }


  const eventNav =
    document.querySelector(
      '[data-v="events"]'
    );

  if (eventNav) {

    eventNav.addEventListener(
      "click",
      () => {

        setTimeout(
          loadEvents,
          0
        );
      }
    );
  }

}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    wireLinkEvents
  );

} else {

  wireLinkEvents();
}


/* END LINK NONPROFIT EVENTS */
