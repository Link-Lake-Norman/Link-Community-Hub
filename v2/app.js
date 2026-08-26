function showModal(kicker,title,html){document.getElementById("modalKicker").textContent=kicker;document.getElementById("modalTitle").textContent=title;document.getElementById("modalContent").innerHTML=html;document.getElementById("modalBackdrop").hidden=false;document.body.style.overflow="hidden"}
function closeModal(){document.getElementById("modalBackdrop").hidden=true;document.body.style.overflow=""}
function openOpportunity(org,title){showModal(org,title,`<p>This opportunity is tied to the verified <strong>${org}</strong> organization record.</p><p>Registration will happen inside LINK Community Hub™ so the right opportunity always routes to the right nonprofit.</p>`)}
function openAllNeeds(){showModal("COMMUNITY NEEDS","Find Where You Can Make an Impact","<p>The full marketplace will include volunteering, donations, mentoring, professional expertise, student opportunities, business partnerships and events.</p>")}
function openStudentModal(){showModal("STUDENT COMMUNITY AMBASSADORS","Lead. Connect. Serve.","<p>Students can participate through private accounts and school-based Ambassador pathways. No public individual student profiles.</p>")}
function openBusinessModal(){showModal("BUSINESS & COMMUNITY PARTNERS","Put Your Business Behind the Community","<p>Business participation can include sponsorship, employee engagement, community activation, advertising, events and professional services.</p>")}
function openEventsModal(){showModal("COMMUNITY EVENTS","Come Together Around What Matters","<p>Community, nonprofit, school and business events will live here.</p>")}
function openPartnerModal(){showModal("COMMUNITY PARTNERS","A Growing Network Across Lake Norman","<p>The homepage shows a curated partner rail while the full registry can grow to dozens or hundreds of nonprofits.</p>")}
function openHowModal(){showModal("THE LINK ECOSYSTEM","How LINK Moves Community Into Action","<p><strong>Discover → Connect → Activate → Impact.</strong></p><p>LINK brings the right people, organizations, schools, businesses and resources together around real community needs.</p>")}
function scrollNeeds(){document.getElementById("discover").scrollIntoView({behavior:"smooth"})}
function scrollGetInvolved(){document.getElementById("get-involved").scrollIntoView({behavior:"smooth"})}

function renderPartners(){
  const rail=document.getElementById("partnerRail");
  if(!rail) return;
  const list=(window.LINK_NONPROFITS||[]).filter(n=>n.name!=="Seasons of Giving LKN").slice(0,10);
  document.getElementById("nonprofitCount").textContent=(window.LINK_NONPROFITS||[]).filter(n=>n.name!=="Seasons of Giving LKN").length || 20;
  rail.innerHTML=list.map(n=>`<a class="partner" href="${n.website}" target="_blank" rel="noopener"><img src="${n.logo}" alt="${n.name} logo" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${n.name}</span></a>`).join("");
}
renderPartners();
document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});