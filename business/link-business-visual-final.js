(() => {
  "use strict";
  const path=location.pathname.replace(/\/+$/, "/");
  if(path!=="/business/") return;
  const section=document.createElement("section");
  section.id="link-business-visual-final";
  section.setAttribute("aria-label","LINK Business journey, services and assessments");
  section.innerHTML=`
    <div class="lbvf-artwork">
      <img src="/business/assets/link-business-journey-final.png" alt="The LINK Business Journey — Join, Participate and Grow. Explore culture, workforce, visibility, partnerships, community impact and LINK partner recognition.">
      <a class="lbvf-hotspot join" href="/business/register.html" aria-label="JOIN LINK — COMPLIMENTARY THROUGH OCT. 15">Join LINK</a>
      <a class="lbvf-hotspot participate" href="/business/portal.html" aria-label="Open the Business Portal and participate">Participate</a>
      <a class="lbvf-hotspot grow" href="/business/partnership.html" aria-label="Explore business partnership levels">Grow</a>
      <a class="lbvf-hotspot culture" href="/business/audit.html" aria-label="Learn more about culture and the Employee and Culture Audit">Culture — Learn More</a>
      <a class="lbvf-hotspot workforce" href="/lakenorman/community/#workforce" aria-label="Learn more about workforce connections">Workforce — Learn More</a>
      <a class="lbvf-hotspot visibility" href="/business/marketing-visibility.html" aria-label="Learn more about marketing and visibility">Visibility — Learn More</a>
      <a class="lbvf-hotspot partnerships" href="/business/partnership.html" aria-label="Learn more about partnerships">Partnerships — Learn More</a>
      <a class="lbvf-hotspot impact" href="/business/nonprofit-services.html" aria-label="Learn more about community impact">Community Impact — Learn More</a>
      <a class="lbvf-hotspot badge-business" href="/business/partnership.html" aria-label="Business Partner information">Business Partner</a>
      <a class="lbvf-hotspot badge-organization" href="/lakenorman/community/" aria-label="Organization Partner information">Organization Partner</a>
      <a class="lbvf-hotspot badge-school" href="/lakenorman/groups/" aria-label="School Partner information">School Partner</a>
      <a class="lbvf-hotspot badge-nonprofit" href="/lakenorman/nonprofits/" aria-label="Nonprofit Partner information">Nonprofit Partner</a>
      <a class="lbvf-hotspot badge-community" href="/lakenorman/community/" aria-label="Community Partner information">Community Partner</a>
      <a class="lbvf-hotspot stickers" href="mailto:info@linkcommunityhub.com?subject=LINK%20Partner%20Sticker%20Request" aria-label="Request LINK partner stickers">Request Stickers</a>
      <a class="lbvf-hotspot levels" href="/business/partnership.html" aria-label="Explore LINK partnership levels">Explore Partnership Levels</a>
    </div>
    <div class="lbvf-assessments" id="link-assessments">
      <p class="kicker">LINK ASSESSMENTS</p>
      <h2>Start with insight. Build from what is real.</h2>
      <p class="intro">Understand workforce interests, culture priorities and practical opportunities before adding another disconnected program.</p>
      <div class="lbvf-assessment-grid one">
        <a class="lbvf-assessment-card" href="/business/audit.html"><h3>Employee + Culture Audit</h3><p>Identify workforce interests, engagement gaps, retention risks and practical community connections.</p><span>EXPLORE THE BUSINESS AUDIT →</span></a>
      </div>
    </div>
    <div class="lbvf-pathways" id="link-business-pathways">
      <p class="kicker">BUILD YOUR LINK PATHWAY</p>
      <h2>Turn business strength into Lake Norman strength.</h2>
      <p class="intro">Connect your people, resources, opportunities and leadership to practical local action. Start free, participate where it fits, and grow the relationship when it creates value.</p>
      <div class="lbvf-pathway-grid">
        <a href="/lakenorman/resources/"><h3>Share Resources</h3><p>Offer useful items, gift cards, auction support, equipment or other resources to verified local nonprofits.</p><span>OPEN RESOURCE EXCHANGE →</span></a>
        <a href="/business/services-overview.html"><h3>Business Services</h3><p>Explore marketing, visibility, workforce, culture, strategy, events and custom LINK services.</p><span>EXPLORE SERVICES →</span></a>
        <a href="/business/partnership.html"><h3>Partner With LINK</h3><p>Build a practical relationship around visibility, workforce, community impact and local connection.</p><span>VIEW PARTNERSHIP OPTIONS →</span></a>
        <a href="/business/sponsorship.html"><h3>Sponsor Local Impact</h3><p>Support eligible nonprofit needs, fundraisers, events and Lake Norman community initiatives.</p><span>EXPLORE SPONSORSHIP →</span></a>
        <a href="/business/post-job.html"><h3>Post Local Jobs</h3><p>Connect Lake Norman talent with employment opportunities through LINK’s review workflow.</p><span>POST A JOB →</span></a>
        <a href="/business/post-internship.html"><h3>Post Internships</h3><p>Create career exposure, mentorship and structured internship opportunities for local students and talent.</p><span>POST AN INTERNSHIP →</span></a>
        <a href="/business/audit.html"><h3>Strengthen Culture</h3><p>Align employee interests, engagement, retention and community participation around what matters to your people.</p><span>EXPLORE THE CULTURE AUDIT →</span></a>
        <a href="/business/community-events.html"><h3>Gamify Your Teams</h3><p>Create service challenges, friendly competitions, team campaigns and shared-impact experiences with purpose.</p><span>BUILD TEAM ENGAGEMENT →</span></a>
        <a href="/lakenorman/community/#workforce"><h3>Build Workforce Connections</h3><p>Connect employees, schools, students, mentors and local opportunities across the Lake Norman ecosystem.</p><span>EXPLORE WORKFORCE →</span></a>
        <a href="/business/nonprofit-services.html"><h3>Become a Pillar of Strength</h3><p>Use your business, workforce and leadership to help build a stronger, healthier Lake Norman.</p><span>BUILD COMMUNITY IMPACT →</span></a>
      </div>
    </div>`;
  const mount=()=>{
    const main=document.querySelector("main");
    if(!main) return;
    const existing=document.getElementById(section.id);
    if(!existing) main.insertAdjacentElement("afterbegin",section);
    document.body.classList.add("link-business-visual-final-ready");
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true}); else mount();
  window.addEventListener("load",mount,{once:true});
})();
