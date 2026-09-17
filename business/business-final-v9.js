
(function(){
  "use strict";
  const A="/lakenorman/assets/business-final-v9/";
  const id=x=>document.getElementById(x);

  function makeSection(idv, html){
    let s=id(idv);
    if(s) return s;
    s=document.createElement("section");
    s.id=idv;
    s.innerHTML=html;
    return s;
  }

  function hero(){
    return makeSection("linkBusinessFinalHero",`
      <div class="bf9-hero-inner">
        <img src="${A}business-journey-hero.png" alt="The Business Journey — Join. Participate. Grow.">
        <a class="bf9-hero-link bf9-hero-join" href="#business-access" aria-label="JOIN LINK — COMPLIMENTARY THROUGH OCT. 15">Join LINK</a>
        <a class="bf9-hero-link bf9-hero-participate" href="/lakenorman/resources/" aria-label="Participate through the LINK Resource Exchange">Participate</a>
        <a class="bf9-hero-link bf9-hero-grow" href="#linkBusinessFinalTiers" aria-label="Explore LINK partnership levels">Grow</a>
      </div>
    `);
  }

  function badges(){
    return makeSection("linkBusinessFinalBadges",`
      <div class="bf9-kicker">RECOGNIZED PARTNERS</div>
      <h2>Proud to Be Part of LINK.</h2>
      <p class="bf9-lead">Our partner badges showcase your commitment to a stronger Lake Norman. Gain visibility, build trust, and be recognized across our community ecosystem.</p>
      <div class="bf9-badges-grid">
        <a class="bf9-badge" href="#linkBusinessFinalTiers"><img src="${A}business-partner.png" alt="LINK Business Partner badge"></a>
        <a class="bf9-badge" href="/lakenorman/community/"><img src="${A}organization-partner.png" alt="LINK Organization Partner badge"></a>
        <a class="bf9-badge" href="/lakenorman/community/"><img src="${A}school-partner.png" alt="LINK School Partner badge"></a>
        <a class="bf9-badge" href="/lakenorman/nonprofits/"><img src="${A}nonprofit-partner.png" alt="LINK Nonprofit Partner badge"></a>
        <a class="bf9-badge" href="/lakenorman/community/"><img src="${A}community-partner.png" alt="LINK Community Partner badge"></a>
      </div>
      <div class="bf9-badge-actions">
        <a class="bf9-button primary" href="mailto:info@linkcommunityhub.com?subject=LINK%20Partner%20Sticker%20Request">REQUEST STICKERS →</a>
        <a class="bf9-button secondary" href="#linkBusinessFinalTiers">EXPLORE PARTNERSHIP LEVELS →</a>
      </div>
    `);
  }

  function tiers(){
    return makeSection("linkBusinessFinalTiers",`
      <div class="bf9-tier-intro">
        <div class="bf9-kicker">PARTNERSHIP LEVELS</div>
        <h2>Start Free. Grow When It Fits.</h2>
        <p>Participation begins at no cost. Paid partner levels add year-round public visibility, recognition, storytelling and expanded community presence.</p>
      </div>
      <div class="bf9-tier-grid">
        <article class="bf9-tier">
          <span class="bf9-tier-tag">TIER 1 · FREE</span>
          <h3>Community Business</h3>
          <span class="bf9-price">$0</span>
          <p>Connect with approved nonprofits, share resources and participate in local impact. General-public business marketing is not included.</p>
          <span class="bf9-tier-value">PARTICIPATE</span>
        </article>
        <article class="bf9-tier featured">
          <span class="bf9-tier-tag">TIER 2</span>
          <h3>Community Ally</h3>
          <span class="bf9-price">$39/mo · $390/year</span>
          <p>Entry-level year-round public business recognition, partner visibility and community-resource presence.</p>
          <span class="bf9-tier-value">BE SEEN</span>
        </article>
        <article class="bf9-tier">
          <span class="bf9-tier-tag">TIER 3</span>
          <h3>Impact Partner</h3>
          <span class="bf9-price">$99/mo · $990/year</span>
          <p>Enhanced public profile, newsletter opportunities, priority visibility and expanded impact positioning.</p>
          <span class="bf9-tier-value">SHOW IMPACT</span>
        </article>
        <article class="bf9-tier">
          <span class="bf9-tier-tag">TIER 4</span>
          <h3>Community Champion</h3>
          <span class="bf9-price">$249/mo · $2,490/year</span>
          <p>Featured placement, expanded storytelling, campaign visibility and leadership-level community recognition.</p>
          <span class="bf9-tier-value">LEAD LOCALLY</span>
        </article>
        <article class="bf9-tier">
          <span class="bf9-tier-tag">TIER 5</span>
          <h3>Presenting Partner</h3>
          <span class="bf9-price">Starting at $5,000/year</span>
          <p>Signature recognition and a customized community-impact and sponsorship relationship.</p>
          <span class="bf9-tier-value">LEADERSHIP</span>
        </article>
      </div>
      <div class="bf9-tier-offer">
        <div>
          <strong>Tier 2+ before October 10: Save 10% on your first year.</strong>
          <span>Join the first public group of LINK Business Partners before the public Business experience launches.</span>
        </div>
        <a class="bf9-button secondary" href="/business/partnership.html">EXPLORE PARTNERSHIP →</a>
      </div>
    `);
  }

  function how(){
    return makeSection("linkBusinessFinalHow",`
      <div class="bf9-how-inner">
        <div class="bf9-how-copy">
          <div class="bf9-kicker">WHEN YOU'RE READY</div>
          <h2>How to Partner.</h2>
          <p class="bf9-lead">See the process before you register: apply, get approved and use your LINK partner recognition to show how your business supports Lake Norman.</p>
        </div>
        <div class="bf9-how-visual">
          <img src="${A}how-to-partner.png" alt="How to partner with LINK Community Hub in three simple steps">
        </div>
      </div>
    `);
  }

  function retitle(){
    const v=id("businessValue");
    if(!v) return;
    const e=v.querySelector(".eyebrow");
    const h=v.querySelector("h2");
    const p=v.querySelector(":scope > p");
    if(e) e.textContent="REAL SOLUTIONS. LASTING IMPACT.";
    if(h) h.textContent="How LINK Helps Your Business Thrive.";
    if(p) p.textContent="From useful resources and workforce engagement to sponsorships, strategic audits, professional services and custom partnerships, LINK connects your business to practical ways to strengthen relationships and create local impact.";
  }

  function build(){
    const m=document.querySelector("main.auth-shell");
    const r=id("businessResourceStory");
    const v=id("businessValue");
    const a=id("business-access");
    const l=document.querySelector(".business-approved-lower-panel");
    const d=m && m.querySelector(".disclaimer");
    if(!m || !r || !v || !a || !l) return false;

    retitle();
    [hero(), r, v, badges(), tiers(), how(), l, a, d]
      .filter(Boolean)
      .forEach(n=>m.appendChild(n));

    document.body.classList.add("business-final-v9");
    return true;
  }

  function boot(){
    if(build()) return;
    const o=new MutationObserver(()=>{ if(build()) o.disconnect(); });
    o.observe(document.documentElement,{subtree:true,childList:true});
    setTimeout(()=>o.disconnect(),8000);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  } else {
    boot();
  }
})();
