/*
 * LINK BUSINESS FINAL STORY
 *
 * Hero
 * → 3 Ways
 * → 3 Steps
 * → 5 Tier Snapshot
 * → Who's Who
 * → Join / Sign In
 *
 * Existing functions, routes, forms, nav and footer preserved.
 */

(function(){
  "use strict";

  const all = (selector, root=document) =>
    Array.from(root.querySelectorAll(selector));

  const text = el =>
    String(el?.textContent || "")
      .replace(/\s+/g," ")
      .trim();

  function sectionByText(regex){

    return all(
      "#linkBusinessExperienceV3 section"
    ).find(section =>
      regex.test(text(section))
    ) || null;

  }

  function simplifyHero(){

    const panel =
      document.querySelector(
        ".b3-value-panel"
      );

    if(!panel) return;

    panel.innerHTML = `
      <div class="b5-hero-card">

        <div class="b5-hero-label">
          START FREE TODAY
        </div>

        <strong>
          Participate now.
        </strong>

        <p>
          Connect your business to
          local nonprofits, resources
          and opportunities.
        </p>

        <div class="b5-hero-divider"></div>

        <div class="b5-hero-label">
          PUBLIC BUSINESS LAUNCH
        </div>

        <strong>
          October 10
        </strong>

        <p>
          Tier 2+ partners unlock
          public visibility, recognition
          and impact reporting.
        </p>

        <div class="b5-hero-offer">
          SAVE 10% ON YOUR FIRST YEAR
          BEFORE OCTOBER 10
        </div>

      </div>
    `;

  }

  function simplifyLanes(){

    const section =
      document.getElementById(
        "linkV3Lanes"
      );

    if(!section) return;

    const heading =
      section.querySelector(
        ".b3-heading"
      );

    if(heading){

      heading.innerHTML = `
        <div class="b3-eyebrow">
          THREE WAYS TO START
        </div>

        <h2>
          Choose what fits your business.
        </h2>

        <p>
          You do not have to do everything.
          Start with one meaningful action.
        </p>
      `;

    }

    const lanes =
      section.querySelector(
        ".b3-lanes"
      );

    if(!lanes) return;

    lanes.innerHTML = `

      <article class="b3-lane b5-simple-lane">

        <div class="b3-lane-icon">↗</div>

        <div class="b3-lane-label">
          GIVE
        </div>

        <h3>
          Share what you have.
        </h3>

        <p>
          Resources, supplies, equipment,
          gift cards, expertise or sponsorship.
        </p>

        <a
          href="/lakenorman/resources/"
          class="b3-btn navy"
        >
          RESOURCE EXCHANGE →
        </a>

      </article>

      <article class="b3-lane b5-simple-lane">

        <div class="b3-lane-icon">◎</div>

        <div class="b3-lane-label">
          ENGAGE
        </div>

        <h3>
          Activate your people.
        </h3>

        <p>
          Connect employees and teams with
          local needs, events and opportunities.
        </p>

        <a
          href="/lakenorman/opportunities/"
          class="b3-btn navy"
        >
          FIND OPPORTUNITIES →
        </a>

      </article>

      <article class="b3-lane b5-simple-lane">

        <div class="b3-lane-icon">★</div>

        <div class="b3-lane-label">
          BE SEEN
        </div>

        <h3>
          Show how you support Lake Norman.
        </h3>

        <p>
          Tier 2+ adds public visibility,
          recognition and impact reporting.
        </p>

        <a
          href="#linkV3Tiers"
          class="b3-btn navy"
        >
          SEE PARTNER LEVELS →
        </a>

      </article>

    `;

  }

  function simplifySteps(){

    const section =
      sectionByText(
        /Join\.\s*Participate\.\s*Grow/i
      );

    if(!section) return null;

    const heading =
      section.querySelector(
        ".b3-heading"
      );

    if(heading){

      heading.innerHTML = `
        <div class="b3-eyebrow">
          HOW LINK WORKS
        </div>

        <h2>
          Join. Participate. Grow.
        </h2>
      `;

    }

    const grid =
      section.querySelector(
        ".b3-steps"
      );

    if(grid){

      grid.innerHTML = `

        <article class="b3-step">

          <div class="b3-step-no">
            1
          </div>

          <h3>
            Join LINK
          </h3>

          <p>
            Create your business account.
          </p>

        </article>

        <article class="b3-step">

          <div class="b3-step-no">
            2
          </div>

          <h3>
            Participate
          </h3>

          <p>
            Give, connect or engage your team.
          </p>

        </article>

        <article class="b3-step">

          <div class="b3-step-no">
            3
          </div>

          <h3>
            Grow
          </h3>

          <p>
            Add visibility when it creates value.
          </p>

        </article>

      `;

    }

    return section;

  }

  function simplifyTiers(){

    const section =
      document.getElementById(
        "linkV3Tiers"
      );

    if(!section) return;

    section.className =
      "b3-section white b5-tier-section";

    section.innerHTML = `

      <div class="b3-wrap">

        <div class="b5-tier-intro">

          <div class="b3-eyebrow">
            PARTNERSHIP LEVELS
          </div>

          <h2>
            Start free.
            Grow when it fits.
          </h2>

          <p>
            Five levels.
            One simple progression.
          </p>

        </div>

        <div class="b5-tier-track">

          <article class="b5-tier">

            <div class="b5-tier-no">
              TIER 1 · FREE
            </div>

            <h3>
              Community Business
            </h3>

            <div class="b5-tier-role">
              PARTICIPATE
            </div>

            <p>
              Private LINK access.
            </p>

          </article>

          <article class="b5-tier t2">

            <div class="b5-tier-no">
              TIER 2
            </div>

            <h3>
              Community Ally
            </h3>

            <div class="b5-tier-role">
              BE SEEN
            </div>

            <p>
              Public recognition begins.
            </p>

            <span class="b5-tier-highlight">
              FIRST PAID LEVEL
            </span>

          </article>

          <article class="b5-tier">

            <div class="b5-tier-no">
              TIER 3
            </div>

            <h3>
              Impact Partner
            </h3>

            <div class="b5-tier-role">
              SHOW IMPACT
            </div>

            <p>
              Visibility + reporting.
            </p>

          </article>

          <article class="b5-tier t4">

            <div class="b5-tier-no">
              TIER 4
            </div>

            <h3>
              Community Champion
            </h3>

            <div class="b5-tier-role">
              LEAD LOCALLY
            </div>

            <p>
              Expanded recognition.
            </p>

          </article>

          <article class="b5-tier">

            <div class="b5-tier-no">
              TIER 5
            </div>

            <h3>
              Presenting Partner
            </h3>

            <div class="b5-tier-role">
              LEADERSHIP
            </div>

            <p>
              Highest-level presence.
            </p>

          </article>

        </div>

        <div class="b5-offer">

          <div>

            <strong>
              Tier 2+ before October 10:
              Save 10% on your first year.
            </strong>

            <span>
              Join the first public group
              of LINK Business Partners.
            </span>

          </div>

          <a
            href="/api/business/upgrade"
            class="b3-btn green"
          >
            EXPLORE TIER 2+ →
          </a>

        </div>

        <details class="b5-compare">

          <summary>
            Compare Levels + Pricing
          </summary>

          <div class="b5-compare-body">

            <p class="b5-compare-copy">
              Open the full comparison only
              when you want the details.
            </p>

            <a
              class="b5-compare-image"
              href="/api/brand/member-entry?source=business"
              target="_blank"
              rel="noopener"
            >
              <img
                src="/lakenorman/assets/services/LINK-partner-marketing-kit.png"
                alt="LINK Business Partnership Levels"
              >
            </a>

            <div class="b5-compare-actions">

              <a
                href="/api/brand/member-entry?source=business"
                target="_blank"
                rel="noopener"
                class="b3-btn navy"
              >
                OPEN FULL GUIDE →
              </a>

            </div>

          </div>

        </details>

      </div>
    `;

  }

  function simplifyWhosWho(){

    const section =
      document.getElementById(
        "linkV3Visibility"
      );

    if(!section) return;

    const eyebrow =
      section.querySelector(
        ".b3-eyebrow"
      );

    if(eyebrow){
      eyebrow.textContent =
        "PUBLIC BUSINESS EXPERIENCE · OCTOBER 10";
    }

    const heading =
      section.querySelector("h2");

    if(heading){

      heading.innerHTML = `
        You're doing the work.
        <span>
          Let Lake Norman see it.
        </span>
      `;

    }

    const paragraphs =
      all("p", section);

    if(paragraphs[0]){

      paragraphs[0].textContent =
        "Tier 2+ partners become part of LINK's public Who's Who of businesses choosing to invest locally.";

    }

    paragraphs
      .slice(1)
      .forEach(p => {
        p.style.display = "none";
      });

  }


  function buildBusinessValueStory(){

    const root =
      document.getElementById(
        "linkBusinessExperienceV3"
      );

    const hero =
      root?.querySelector(
        ".b3-hero"
      );

    if(!root || !hero){
      return null;
    }

    const old =
      document.getElementById(
        "linkBusinessValueStory"
      );

    if(old){
      old.remove();
    }

    const section =
      document.createElement(
        "section"
      );

    section.id =
      "linkBusinessValueStory";

    section.className =
      "b6-value-story";

    section.innerHTML = `

      <div class="b6-value-wrap">

        <div class="b6-value-heading">

          <div class="b6-value-eyebrow">
            WHY LINK MATTERS TO BUSINESS
          </div>

          <h2>
            Community impact can strengthen
            <span>your business, too.</span>
          </h2>

          <p>
            LINK Community Hub™ connects what your
            business wants to strengthen internally
            with real needs and relationships across
            Lake Norman.
          </p>

        </div>

        <div class="b6-impact-split">

          <article>

            <div class="b6-impact-label">
              VALUE TO YOUR BUSINESS
            </div>

            <h3>
              Turn community involvement into
              something your people can feel.
            </h3>

            <p>
              Create shared purpose, meaningful
              employee engagement, stronger local
              relationships and a clearer story about
              how your company shows up.
            </p>

          </article>

          <article>

            <div class="b6-impact-label">
              VALUE TO LAKE NORMAN
            </div>

            <h3>
              Keep more support connected locally.
            </h3>

            <p>
              Help nonprofits access volunteers,
              resources, expertise, sponsorship,
              visibility and business relationships
              from the community around them.
            </p>

          </article>

        </div>

        <div class="b6-recognition">

          <div class="b6-recognition-copy">

            <div class="b6-impact-label">
              RECOGNITION THAT MEANS SOMETHING
            </div>

            <h3>
              Show that your business is
              investing in the community.
            </h3>

            <p>
              LINK partner recognition helps eligible
              businesses communicate their local
              involvement through approved digital
              badges and Community Partner assets.
            </p>

          </div>

          <div class="b6-badges">

            <div class="b6-badge">

              <img
                src="/lakenorman/assets/badges/LINK-Certified-Community-Partner-2026.svg"
                alt="LINK Certified Community Partner 2026 badge"
              >

              <strong>
                Certified Community Partner
              </strong>

              <span>
                Recognize active local investment.
              </span>

            </div>

            <div class="b6-badge">

              <img
                src="/lakenorman/assets/badges/LINK-Community-Hub-Lake-Norman-Digital-Badge.png"
                alt="LINK Community Hub Lake Norman digital badge"
              >

              <strong>
                LINK Digital Badge
              </strong>

              <span>
                Extend the story beyond the Hub.
              </span>

            </div>

          </div>

        </div>

        <div class="b6-solutions-heading">

          <div class="b6-impact-label">
            BUSINESS PROBLEMS LINK HELPS ADDRESS
          </div>

          <h3>
            One local ecosystem.
            Three important business priorities.
          </h3>

        </div>

        <div class="b6-solutions">

          <article>

            <div class="b6-solution-no">
              01
            </div>

            <h4>
              CULTURE
            </h4>

            <strong>
              Give your people a shared purpose.
            </strong>

            <p>
              Align community involvement with
              employee interests, company values,
              team participation and meaningful
              ways to contribute together.
            </p>

          </article>

          <article>

            <div class="b6-solution-no">
              02
            </div>

            <h4>
              WORKFORCE
            </h4>

            <strong>
              Build connection beyond the job.
            </strong>

            <p>
              Create opportunities for engagement,
              leadership, teamwork, relationship
              building and stronger connection
              to the place employees live and work.
            </p>

          </article>

          <article>

            <div class="b6-solution-no">
              03
            </div>

            <h4>
              BUSINESS DEVELOPMENT
            </h4>

            <strong>
              Be known for how you show up.
            </strong>

            <p>
              Build trusted local relationships,
              strengthen community visibility,
              meet organizations and businesses,
              and make your impact easier to see.
            </p>

          </article>

        </div>

        <div class="b6-value-close">

          <strong>
            Start by participating.
            Grow your visibility when it makes sense.
          </strong>

          <p>
            You do not need to choose a paid level
            just to begin connecting through LINK.
          </p>

        </div>

      </div>
    `;

    hero.insertAdjacentElement(
      "afterend",
      section
    );

    return section;
  }

  function hideEverythingSecondary(){

    const root =
      document.getElementById(
        "linkBusinessExperienceV3"
      );

    if(!root) return;

    const keep = new Set([
      document.querySelector(".b3-hero"),
      document.getElementById("linkBusinessValueStory"),
      document.getElementById("linkV3Lanes"),
      sectionByText(/Join\.\s*Participate\.\s*Grow/i),
      document.getElementById("linkV3Tiers"),
      document.getElementById("linkV3Visibility"),
      document.getElementById("linkV3Account")
    ]);

    all(
      ":scope > section",
      root
    ).forEach(section => {

      if(
        !keep.has(section)
      ){
        section.classList.add(
          "b5-secondary-story"
        );
      }

    });

  }

  function reorder(){

    const root =
      document.getElementById(
        "linkBusinessExperienceV3"
      );

    if(!root) return;

    const hero =
      root.querySelector(
        ".b3-hero"
      );

    const valueStory =
      document.getElementById(
        "linkBusinessValueStory"
      );

    const lanes =
      document.getElementById(
        "linkV3Lanes"
      );

    const steps =
      sectionByText(
        /Join\.\s*Participate\.\s*Grow/i
      );

    const tiers =
      document.getElementById(
        "linkV3Tiers"
      );

    const whosWho =
      document.getElementById(
        "linkV3Visibility"
      );

    const account =
      document.getElementById(
        "linkV3Account"
      );

    const ordered = [
      hero,
      valueStory,
      lanes,
      steps,
      tiers,
      whosWho,
      account
    ].filter(Boolean);

    ordered.forEach(
      section =>
        root.appendChild(section)
    );

  }

  function build(){

    const root =
      document.getElementById(
        "linkBusinessExperienceV3"
      );

    if(!root){

      setTimeout(
        build,
        100
      );

      return;
    }

    if(
      document.body.dataset
        .linkBusinessFinal ===
      "true"
    ){
      return;
    }

    document.body.dataset
      .linkBusinessFinal =
      "true";

    document.body.classList.add(
      "link-business-v5"
    );

    simplifyHero();

    buildBusinessValueStory();

    simplifyLanes();

    simplifySteps();

    simplifyTiers();

    simplifyWhosWho();

    hideEverythingSecondary();

    reorder();

  }

  if(
    document.readyState ===
    "loading"
  ){
    document.addEventListener(
      "DOMContentLoaded",
      build
    );
  }else{
    build();
  }

})();
