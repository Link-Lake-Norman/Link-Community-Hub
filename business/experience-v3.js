/*
 * LINK BUSINESS EXPERIENCE V3
 *
 * PRESENTATION LAYER ONLY.
 *
 * Existing registration, sign-in, IDs, APIs,
 * resource workflows and business links remain intact.
 */

(function () {
  "use strict";

  const $all =
    (selector, root = document) =>
      Array.from(
        root.querySelectorAll(selector)
      );

  function clean(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function esc(value) {
    return String(value || "")
      .replace(
        /[&<>"']/g,
        ch => ({
          "&":"&amp;",
          "<":"&lt;",
          ">":"&gt;",
          '"':"&quot;",
          "'":"&#39;"
        })[ch]
      );
  }

  function hrefFor(regex, fallback) {

    const anchor =
      $all("a").find(a =>
        regex.test(
          clean(a.textContent)
        )
      );

    return (
      anchor?.getAttribute("href") ||
      fallback
    );
  }

  function findAccountSection() {

    const sections =
      $all("section");

    const hit =
      sections.find(section =>
        /Access\s*&\s*Update Your Business Profile/i
          .test(
            clean(section.textContent)
          )
      );

    return hit || null;
  }

  function collectImages() {

    return $all("main img")
      .map(img => ({
        src:
          img.currentSrc ||
          img.getAttribute("src") ||
          "",
        alt:
          img.getAttribute("alt") ||
          ""
      }))
      .filter(image =>
        image.src &&
        !/logo|badge|qr|sticker/i
          .test(
            image.src +
            " " +
            image.alt
          )
      );
  }

  function imageFor(images, regex, fallbackIndex) {

    const hit =
      images.find(image =>
        regex.test(
          image.src +
          " " +
          image.alt
        )
      );

    return (
      hit ||
      images[fallbackIndex] ||
      null
    );
  }

  function imageMarkup(image, fallbackText) {

    if (!image) {
      return `
        <div class="b3-whoswho-placeholder">
          ${esc(fallbackText)}
        </div>
      `;
    }

    return `
      <img
        src="${esc(image.src)}"
        alt="${esc(image.alt || fallbackText)}"
      >
    `;
  }

  function removeDuplicateNavigation() {

    const labels = [
      "NONPROFITS",
      "BUSINESSES",
      "SERVICES",
      "RESOURCE EXCHANGE",
      "EVENTS"
    ];

    const candidates =
      $all("header,nav")
        .filter(element => {

          const content =
            clean(
              element.textContent
            ).toUpperCase();

          const score =
            labels.filter(label =>
              content.includes(label)
            ).length;

          return score >= 4;
        })
        .sort(
          (a,b) =>
            a.getBoundingClientRect().top -
            b.getBoundingClientRect().top
        );

    if (
      candidates.length < 2
    ) {
      return;
    }

    candidates
      .slice(1)
      .forEach(nav => {

        nav.classList.add(
          "link-v3-nav-hidden"
        );

        nav.setAttribute(
          "aria-hidden",
          "true"
        );

        const previous =
          nav.previousElementSibling;

        if (
          previous &&
          previous.tagName === "HEADER" &&
          previous.querySelector("img")
        ) {
          previous.classList.add(
            "link-v3-nav-hidden"
          );

          previous.setAttribute(
            "aria-hidden",
            "true"
          );
        }
      });
  }

  function activateAccountMode(mode) {

    const account =
      document.getElementById(
        "linkV3AccountMount"
      );

    account?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });

    window.setTimeout(
      function () {

        const buttons =
          $all(
            "button,a,[role='button']",
            account
          );

        const matcher =
          mode === "new"
            ? /New Business/i
            : /Sign In/i;

        const button =
          buttons.find(item =>
            matcher.test(
              clean(item.textContent)
            )
          );

        button?.click();

      },
      450
    );
  }

  function installMotion() {

    const items =
      $all(".b3-reveal");

    if (
      !("IntersectionObserver" in window)
    ) {
      items.forEach(
        item =>
          item.classList.add(
            "visible"
          )
      );

      return;
    }

    const observer =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            if (
              entry.isIntersecting
            ) {
              entry.target.classList.add(
                "visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          });

        },
        {
          threshold:.08
        }
      );

    items.forEach(
      item =>
        observer.observe(item)
    );
  }

  function build() {

    if (
      document.getElementById(
        "linkBusinessExperienceV3"
      )
    ) {
      return;
    }

    const main =
      document.querySelector("main");

    if (!main) {
      return;
    }

    document.body.classList.add(
      "link-business-v3"
    );

    /*
     * Capture all existing links BEFORE
     * hiding old marketing sections.
     */

    const resourceHref =
      hrefFor(
        /RESOURCE EXCHANGE/i,
        "/lakenorman/resources/"
      );

    const workforceHref =
      hrefFor(
        /WORKFORCE OPPORTUNITIES|ENGAGE EMPLOYEES|WORKFORCE ENGAGEMENT/i,
        "/lakenorman/opportunities/"
      );

    const sponsorHref =
      hrefFor(
        /EXPLORE SPONSORSHIP|SPONSORSHIP/i,
        "/business/sponsorship.html"
      );

    const auditHref =
      hrefFor(
        /CUSTOM AUDIT|EXPLORE THE AUDIT|REQUEST A CUSTOM AUDIT/i,
        "/business/audit.html"
      );

    const partnershipHref =
      hrefFor(
        /BUILD A PARTNERSHIP|STRATEGIC PARTNERSHIP/i,
        "/business/partnership.html"
      );

    const servicesHref =
      hrefFor(
        /SERVICES FOR NONPROFITS|PROFESSIONAL SERVICES/i,
        "/business/nonprofit-services.html"
      );

    const talkHref =
      hrefFor(
        /TALK WITH LINK|ASK LINK A QUESTION/i,
        "mailto:info@linkcommunityhub.com"
      );

    const images =
      collectImages();

    const resourceImage =
      imageFor(
        images,
        /office|furniture|resource|surplus/i,
        1
      );

    const retentionImage =
      imageFor(
        images,
        /retention|connection|workforce|employee/i,
        2
      );

    const partnerImage =
      imageFor(
        images,
        /businesses-become-community-partner|how.to.partner|community.partner/i,
        3
      );

    /*
     * MOVE the original working account section.
     * We do not clone or recreate it.
     */

    const accountSection =
      findAccountSection();

    if (accountSection) {
      accountSection.removeAttribute(
        "hidden"
      );

      accountSection.classList.remove(
        "link-v3-original-hidden"
      );
    }

    const experience =
      document.createElement("div");

    experience.id =
      "linkBusinessExperienceV3";

    experience.innerHTML = `

      <!-- HERO -->

      <section class="b3-hero">

        <div class="b3-wrap b3-hero-grid">

          <div class="b3-hero-copy">

            <div class="b3-kicker">
              LAKE NORMAN BUSINESS COMMUNITY
            </div>

            <h1>
              Your business already has the power
              to <em>move this community forward.</em>
            </h1>

            <p class="b3-hero-lead">
              People. Resources. Expertise. Relationships.
              LINK turns what your business already has
              into meaningful local action — without making
              community involvement complicated.
            </p>

            <div class="b3-actions">

              <a
                href="#linkV3Account"
                class="b3-btn green"
                data-b3-new
              >
                JOIN LINK — COMPLIMENTARY THROUGH OCT. 15 →
              </a>

              <a
                href="#linkV3Lanes"
                class="b3-btn white"
              >
                SHOW ME HOW IT WORKS
              </a>

              <a
                href="#linkV3Account"
                class="b3-btn white"
                data-b3-signin
              >
                ALREADY IN LINK? SIGN IN
              </a>

            </div>

          </div>

          <aside class="b3-value-panel">

            <div class="b3-launch-small">

              <span>
                PUBLIC BUSINESS EXPERIENCE
              </span>

              <strong>
                OCTOBER 10
              </strong>

              <b>
                Tier 2+ Early Partners save
                10% on their first year.
              </b>

            </div>

            <div class="b3-value-grid">

              <div class="b3-value">
                <div class="b3-value-number">
                  01
                </div>
                <strong>
                  GIVE
                </strong>
                <span>
                  Put useful resources
                  into local hands.
                </span>
              </div>

              <div class="b3-value">
                <div class="b3-value-number">
                  02
                </div>
                <strong>
                  ENGAGE
                </strong>
                <span>
                  Connect employees
                  to meaningful action.
                </span>
              </div>

              <div class="b3-value">
                <div class="b3-value-number">
                  03
                </div>
                <strong>
                  CONNECT
                </strong>
                <span>
                  Find nonprofits and
                  opportunities locally.
                </span>
              </div>

              <div class="b3-value">
                <div class="b3-value-number">
                  TIER 2+
                </div>
                <strong>
                  BE SEEN
                </strong>
                <span>
                  Public visibility,
                  recognition + reporting.
                </span>
              </div>

            </div>

          </aside>

        </div>

      </section>

      <!-- QUICK PROOF -->

      <section class="b3-proof">

        <div class="b3-wrap b3-proof-grid">

          <div class="b3-proof-item">
            <strong>Free to Start</strong>
            <span>
              Businesses can begin participating
              without a paid membership.
            </span>
          </div>

          <div class="b3-proof-item">
            <strong>Local by Design</strong>
            <span>
              Support stays connected to
              the Lake Norman region.
            </span>
          </div>

          <div class="b3-proof-item">
            <strong>One Place</strong>
            <span>
              Resources, nonprofits, people,
              events and opportunities.
            </span>
          </div>

          <div class="b3-proof-item">
            <strong>Grow When Ready</strong>
            <span>
              Paid levels unlock public
              visibility and reporting.
            </span>
          </div>

        </div>

      </section>

      <!-- THREE WAYS -->

      <section
        id="linkV3Lanes"
        class="b3-section white"
      >

        <div class="b3-wrap">

          <div class="b3-heading b3-reveal">

            <div class="b3-eyebrow">
              WHERE DO YOU WANT TO START?
            </div>

            <h2>
              One business.
              Three powerful ways to show up.
            </h2>

            <p>
              You do not need another complicated program.
              Choose what fits your business today and
              build from there.
            </p>

          </div>

          <div class="b3-lanes">

            <article class="b3-lane b3-reveal">

              <div class="b3-lane-icon">
                ↗
              </div>

              <div class="b3-lane-label">
                GIVE WHAT YOU HAVE
              </div>

              <h3>
                Turn useful things into local support.
              </h3>

              <p>
                Furniture, equipment, supplies, gift cards,
                auction items, products, professional
                expertise and other in-kind resources.
              </p>

              <ul>
                <li>✓ Post available resources</li>
                <li>✓ Approved nonprofits request them</li>
                <li>✓ You approve the connection</li>
              </ul>

              <a
                href="${esc(resourceHref)}"
                class="b3-btn navy"
              >
                EXPLORE RESOURCE EXCHANGE →
              </a>

            </article>

            <article class="b3-lane b3-reveal">

              <div class="b3-lane-icon">
                ◎
              </div>

              <div class="b3-lane-label">
                ACTIVATE YOUR PEOPLE
              </div>

              <h3>
                Give employees a reason to care locally.
              </h3>

              <p>
                Connect your team with volunteer projects,
                events, nonprofit needs, service activities
                and causes employees can actually see.
              </p>

              <ul>
                <li>✓ Team opportunities</li>
                <li>✓ Community involvement</li>
                <li>✓ Stronger local connection</li>
              </ul>

              <a
                href="${esc(workforceHref)}"
                class="b3-btn navy"
              >
                ENGAGE YOUR TEAM →
              </a>

            </article>

            <article class="b3-lane b3-reveal">

              <div class="b3-lane-icon">
                ★
              </div>

              <div class="b3-lane-label">
                TIER 2+ · BE SEEN
              </div>

              <h3>
                Let Lake Norman see how you show up.
              </h3>

              <p>
                Paid Community Partners unlock eligible
                public business visibility, recognition,
                impact reporting and expanded promotion.
              </p>

              <ul>
                <li>✓ Public business profile</li>
                <li>✓ Who's Who recognition</li>
                <li>✓ Impact reporting</li>
              </ul>

              <a
                href="#linkV3Visibility"
                class="b3-btn navy"
              >
                SEE PARTNER BENEFITS →
              </a>

            </article>

          </div>

        </div>

      </section>

      <!-- HOW IT WORKS -->

      <section class="b3-section soft">

        <div class="b3-wrap">

          <div class="b3-heading b3-reveal">

            <div class="b3-eyebrow">
              SIMPLE BY DESIGN
            </div>

            <h2>
              Join. Participate. Grow.
            </h2>

            <p>
              LINK is built so a business can start
              taking meaningful action without needing
              a committee, a new system or a giant budget.
            </p>

          </div>

          <div class="b3-steps">

            <article class="b3-step b3-reveal">
              <div class="b3-step-no">1</div>
              <h3>Join LINK</h3>
              <p>
                Create your private LINK business account
                and tell us what matters to your business.
              </p>
            </article>

            <article class="b3-step b3-reveal">
              <div class="b3-step-no">2</div>
              <h3>Take Action</h3>
              <p>
                Share resources, support a nonprofit,
                engage your team or respond to a local need.
              </p>
            </article>

            <article class="b3-step b3-reveal">
              <div class="b3-step-no">3</div>
              <h3>Grow the Relationship</h3>
              <p>
                Stay free or move into Tier 2+ when public
                visibility, reporting and deeper partnership
                create value for your business.
              </p>
            </article>

          </div>

        </div>

      </section>

      <!-- RESOURCE STORY -->

      <section class="b3-section">

        <div class="b3-wrap">

          <div class="b3-split b3-reveal">

            <div class="b3-split-media">
              ${imageMarkup(
                resourceImage,
                "Business resources supporting Lake Norman nonprofits"
              )}
            </div>

            <div class="b3-split-copy">

              <div class="b3-eyebrow">
                START WITH SOMETHING SIMPLE
              </div>

              <h2>
                What is sitting in your business
                that someone else could use?
              </h2>

              <p>
                A desk. A cabinet. Event tickets.
                Printing. A gift card. Technology.
                Professional expertise. Surplus inventory.
              </p>

              <p>
                Instead of letting it sit, LINK gives it
                a path to a verified local nonprofit.
              </p>

              <ul class="b3-big-list">
                <li>Post it once.</li>
                <li>A nonprofit requests it.</li>
                <li>You approve the recipient.</li>
                <li>LINK connects both parties.</li>
              </ul>

              <a
                href="${esc(resourceHref)}"
                class="b3-btn green"
              >
                SEE THE RESOURCE EXCHANGE →
              </a>

            </div>

          </div>

        </div>

      </section>

      <!-- EMPLOYEE STORY -->

      <section class="b3-section white">

        <div class="b3-wrap">

          <div class="b3-split b3-reveal">

            <div class="b3-split-copy">

              <div class="b3-eyebrow">
                YOUR PEOPLE ARE PART OF THE STORY
              </div>

              <h2>
                Community connection can start
                inside your workforce.
              </h2>

              <p>
                Employees want meaningful ways to connect,
                contribute and understand the community
                around them.
              </p>

              <p>
                LINK helps businesses discover local
                volunteer projects, service opportunities,
                nonprofit needs, events and team experiences
                without searching across dozens of places.
              </p>

              <div class="b3-actions">

                <a
                  href="${esc(workforceHref)}"
                  class="b3-btn navy"
                >
                  FIND TEAM OPPORTUNITIES →
                </a>

                <a
                  href="${esc(auditHref)}"
                  class="b3-btn outline"
                >
                  EXPLORE A CULTURE AUDIT →
                </a>

              </div>

            </div>

            <div class="b3-split-media">
              ${imageMarkup(
                retentionImage,
                "Employee engagement and community connection"
              )}
            </div>

          </div>

        </div>

      </section>

      <!-- WHO'S WHO -->

      <section
        id="linkV3Visibility"
        class="b3-section dark"
      >

        <div class="b3-wrap b3-whoswho">

          <div class="b3-reveal">

            <div class="b3-eyebrow">
              PUBLIC BUSINESS LAUNCH · OCTOBER 10
            </div>

            <h2>
              You're doing the work.
              <span>Let Lake Norman see it.</span>
            </h2>

            <p>
              On October 10, LINK launches the public
              Business Partner experience — a growing
              Who's Who of businesses choosing to invest
              their resources, people and support locally.
            </p>

            <p>
              Community Business accounts remain private within
              the LINK participation network.
              Public visibility is a Tier 2+ benefit.
            </p>

            <div class="b3-whoswho-offer">
              <strong>
                FOUNDING PARTNER OFFER
              </strong>

              <span>
                Upgrade to Tier 2+ before October 10
                and receive 10% off your first year.
              </span>
            </div>

            <div class="b3-actions">

              <a
                href="/api/business/upgrade"
                class="b3-btn green"
              >
                UPGRADE + SAVE 10% →
              </a>

              <a
                href="/services/"
                class="b3-btn white"
              >
                PREVIEW THE WHO'S WHO →
              </a>

            </div>

          </div>

          <div class="b3-whoswho-card b3-reveal">

            ${imageMarkup(
              partnerImage,
              "LINK Community Business Partner"
            )}

          </div>

        </div>

      </section>


      <!-- LINK BUSINESS TIER LADDER V4 -->

      <section
        id="linkV3Tiers"
        class="b3-section white b4-tier-section"
      >

        <div class="b3-wrap">

          <div class="b3-heading b3-reveal">

            <div class="b3-eyebrow">
              CHOOSE YOUR LEVEL
            </div>

            <h2>
              How visible do you
              want your business to be?
            </h2>

            <p>
              Every business can start with complimentary launch access through October 15, 2026.
              From there, choose the partnership
              level that matches the visibility,
              recognition, reporting and relationship
              your business wants from LINK.
            </p>

          </div>

          <div class="b4-tier-grid">

            <!-- TIER 1 -->

            <article
              class="b4-tier-card free b3-reveal"
            >

              <div class="b4-tier-number">
                TIER 1
              </div>

              <div class="b4-tier-name">
                Community Business
              </div>

              <div class="b4-tier-price free">
                FREE
              </div>

              <div class="b4-tier-purpose">
                PARTICIPATE PRIVATELY
              </div>

              <p>
                Start using LINK to connect with
                nonprofits, resources and local
                opportunities at no cost.
              </p>

              <ul>
                <li>✓ Private LINK business account</li>
                <li>✓ Resource Exchange participation</li>
                <li>✓ Nonprofit resource requests</li>
                <li>✓ Local need discovery</li>
                <li>✓ Employee/community opportunities</li>
                <li class="locked">🔒 No public profile</li>
                <li class="locked">🔒 No public promotion</li>
                <li class="locked">🔒 No impact reporting</li>
              </ul>

              <a
                href="#linkV3Account"
                class="b3-btn navy"
                data-b3-new
              >
                START FREE →
              </a>

            </article>

            <!-- TIER 2 -->

            <article
              class="b4-tier-card paid b3-reveal"
            >

              <div class="b4-tier-number">
                TIER 2
              </div>

              <div class="b4-tier-name">
                Community Ally
              </div>

              <div class="b4-tier-purpose">
                START BEING SEEN
              </div>

              <p>
                The entry point into LINK's paid
                public business experience.
              </p>

              <div class="b4-tier-big-benefit">
                PUBLIC VISIBILITY
              </div>

              <p class="b4-tier-description">
                Built for businesses ready to move
                beyond private participation and begin
                receiving public Community Partner
                recognition.
              </p>

              <a
                href="#linkV3FullPricing"
                class="b3-btn green"
              >
                SEE BENEFITS + PRICING ↓
              </a>

            </article>

            <!-- TIER 3 -->

            <article
              class="b4-tier-card impact b3-reveal"
            >

              <div class="b4-tier-number">
                TIER 3
              </div>

              <div class="b4-tier-name">
                Impact Partner
              </div>

              <div class="b4-tier-purpose">
                SHOW THE IMPACT
              </div>

              <p>
                For businesses that want greater
                visibility and a clearer picture of
                their LINK participation.
              </p>

              <div class="b4-tier-big-benefit">
                VISIBILITY + REPORTING
              </div>

              <p class="b4-tier-description">
                Move from simply participating to
                being able to demonstrate and
                communicate your community involvement.
              </p>

              <a
                href="#linkV3FullPricing"
                class="b3-btn navy"
              >
                COMPARE THIS LEVEL ↓
              </a>

            </article>

            <!-- TIER 4 -->

            <article
              class="b4-tier-card champion b3-reveal"
            >

              <div class="b4-popular">
                FEATURED LEVEL
              </div>

              <div class="b4-tier-number">
                TIER 4
              </div>

              <div class="b4-tier-name">
                Community Champion
              </div>

              <div class="b4-tier-purpose">
                LEAD LOCALLY
              </div>

              <p>
                A stronger recognition level for
                businesses making community engagement
                part of how they show up in Lake Norman.
              </p>

              <div class="b4-tier-big-benefit">
                PREMIUM RECOGNITION
              </div>

              <p class="b4-tier-description">
                Designed to make a business's
                community commitment more visible
                and more useful.
              </p>

              <a
                href="#linkV3FullPricing"
                class="b3-btn green"
              >
                SEE CHAMPION BENEFITS ↓
              </a>

            </article>

            <!-- TIER 5 -->

            <article
              class="b4-tier-card presenting b3-reveal"
            >

              <div class="b4-tier-number">
                TIER 5
              </div>

              <div class="b4-tier-name">
                Presenting Partner
              </div>

              <div class="b4-tier-purpose">
                HIGHEST-LEVEL PARTNERSHIP
              </div>

              <p>
                For organizations looking for LINK's
                highest level of presence, recognition
                and strategic relationship.
              </p>

              <div class="b4-tier-big-benefit">
                LEADERSHIP + PRESENCE
              </div>

              <p class="b4-tier-description">
                The top of the LINK partnership
                ladder for businesses that want to
                play a larger role in the ecosystem.
              </p>

              <a
                href="#linkV3FullPricing"
                class="b3-btn navy"
              >
                EXPLORE PRESENTING ↓
              </a>

            </article>

          </div>

          <!-- EARLY PARTNER OFFER -->

          <div
            class="b4-early-offer b3-reveal"
          >

            <div>

              <div class="b4-offer-kicker">
                BEFORE OCTOBER 10
              </div>

              <strong>
                Tier 2 and higher:
                save 10% on your first year.
              </strong>

              <p>
                Join the first public group of
                LINK Business Partners before the
                Lake Norman business experience
                goes live October 10.
              </p>

            </div>

            <a
              href="/api/business/upgrade"
              class="b3-btn green"
            >
              UPGRADE + SAVE 10% →
            </a>

          </div>

          <!-- CURRENT APPROVED LEVELS / PRICING ASSET -->

          <div
            id="linkV3FullPricing"
            class="b4-full-pricing b3-reveal"
          >

            <div class="b4-pricing-intro">

              <div>

                <div class="b3-eyebrow">
                  COMPLETE PARTNERSHIP OPTIONS
                </div>

                <h3>
                  Compare the full benefits
                  and current pricing.
                </h3>

                <p>
                  See the complete LINK Business
                  Partnership levels together,
                  then choose the level that best
                  fits your business.
                </p>

              </div>

              <div class="b3-actions">

                <a
                  href="/api/brand/member-entry?source=business"
                  target="_blank"
                  rel="noopener"
                  class="b3-btn navy"
                >
                  OPEN FULL PARTNER GUIDE →
                </a>

                <a
                  href="mailto:info@linkcommunityhub.com?subject=LINK%20Business%20Partnership"
                  class="b3-btn outline"
                >
                  HELP ME CHOOSE →
                </a>

              </div>

            </div>

            <a
              href="/api/brand/member-entry?source=business"
              target="_blank"
              rel="noopener"
              class="b4-pricing-image-link"
              aria-label="Open full LINK business partnership levels"
            >

              <img
                src="/lakenorman/assets/services/LINK-partner-marketing-kit.png"
                alt="LINK Community Hub business partnership levels, benefits and pricing"
              >

            </a>

            <div class="b4-pricing-help">
              <strong>
                Not sure which one fits?
              </strong>

              Start free or talk with LINK.
              You do not have to choose a paid
              level just to participate.
            </div>

          </div>

        </div>

      </section>

      <!-- LINK BUSINESS TIER LADDER V4 END -->


      <!-- PLANS -->

      <section class="b3-section soft">

        <div class="b3-wrap">

          <div class="b3-heading b3-reveal">

            <div class="b3-eyebrow">
              NO CONFUSION
            </div>

            <h2>
              Start free.
              Pay when you want more value.
            </h2>

            <p>
              Participation and public visibility are
              intentionally different. Businesses can
              begin inside LINK without paying.
            </p>

          </div>

          <div class="b3-plans">

            <article class="b3-plan b3-reveal">

              <div class="b3-plan-top">
                <span>COMMUNITY BUSINESS</span>
                <strong>FREE</strong>
              </div>

              <ul>
                <li>✓ Private business account</li>
                <li>✓ Resource Exchange participation</li>
                <li>✓ Nonprofit resource requests</li>
                <li>✓ Local need discovery</li>
                <li>✓ Employee/community opportunities</li>

                <li class="locked">
                  🔒 No public business profile
                </li>

                <li class="locked">
                  🔒 No public logo promotion
                </li>

                <li class="locked">
                  🔒 No impact dashboard/reporting
                </li>
              </ul>

              <a
                href="#linkV3Account"
                class="b3-btn navy"
                data-b3-new
              >
                START FREE →
              </a>

            </article>

            <article class="b3-plan paid b3-reveal">

              <div class="b3-plan-top">
                <span>COMMUNITY PARTNER</span>
                <strong>TIER 2+</strong>
              </div>

              <ul>
                <li>✓ Everything in free participation</li>
                <li>✓ Eligible public business profile</li>
                <li>✓ Public logo + recognition</li>
                <li>✓ Who's Who business visibility</li>
                <li>✓ Impact dashboard + reporting</li>
                <li>✓ Expanded promotional opportunities</li>
              </ul>

              <a
                href="/api/business/upgrade"
                class="b3-btn green"
              >
                SEE TIER 2+ OPTIONS →
              </a>

            </article>

          </div>

        </div>

      </section>

      <!-- DEEPER SUPPORT -->

      <section class="b3-section white">

        <div class="b3-wrap">

          <div class="b3-heading left b3-reveal">

            <div class="b3-eyebrow">
              WANT TO GO DEEPER?
            </div>

            <h2>
              LINK can be more than the platform.
            </h2>

            <p>
              For businesses that want deeper strategy,
              LINK can help connect workforce, culture,
              community involvement, sponsorship and
              visibility into something more intentional.
            </p>

          </div>

          <div class="b3-deeper">

            <article class="b3-deeper-main b3-reveal">

              <h3>
                Workforce + Culture
              </h3>

              <p>
                Review where employee engagement,
                retention, community involvement and
                business priorities can align more clearly.
              </p>

              <a
                href="${esc(auditHref)}"
                class="b3-btn navy"
              >
                REQUEST A CUSTOM AUDIT →
              </a>

            </article>

            <article class="b3-deeper-side b3-reveal">

              <h3>
                Strategic Partnership
              </h3>

              <p>
                Build a broader relationship around
                community, people, sponsorship,
                visibility and business priorities.
              </p>

              <a
                href="${esc(partnershipHref)}"
                class="b3-btn navy"
              >
                BUILD A PARTNERSHIP →
              </a>

            </article>

          </div>

        </div>

      </section>

      <!-- ACCOUNT -->

      <section
        id="linkV3Account"
        class="b3-section"
      >

        <div class="b3-wrap">

          <div class="b3-account-intro b3-reveal">

            <div class="b3-eyebrow">
              READY TO CONNECT?
            </div>

            <h2>
              Join LINK or open your Business Portal.
            </h2>

            <p>
              New businesses can start with complimentary launch access through October 15, 2026.
              Existing LINK businesses can securely
              sign in and manage their participation.
            </p>

          </div>

          <div
            id="linkV3AccountMount"
            class="b3-reveal"
          ></div>

        </div>

      </section>

      <!-- FINAL CTA -->

      <section class="b3-final">

        <div class="b3-wrap b3-final-card">

          <div>

            <h2>
              Start somewhere.
              Make it local.
            </h2>

            <p>
              You do not have to solve everything.
              Start with one resource, one employee
              opportunity, one nonprofit connection
              or one conversation.
            </p>

          </div>

          <div class="b3-actions">

            <a
              href="#linkV3Account"
              class="b3-btn green"
              data-b3-new
            >
              JOIN LINK — COMPLIMENTARY THROUGH OCT. 15 →
            </a>

            <a
              href="${esc(talkHref)}"
              class="b3-btn white"
            >
              TALK WITH LINK →
            </a>

          </div>

        </div>

      </section>

    `;

    /*
     * Hide the old MARKETING presentation without
     * deleting any original nodes or functionality.
     *
     * Navigation/header/footer are NOT touched here.
     */

    const originalChildren =
      Array.from(main.children);

    main.prepend(
      experience
    );

    originalChildren.forEach(child => {

      if (
        child === accountSection ||
        ["SCRIPT","STYLE","TEMPLATE","HEADER","NAV","FOOTER"]
          .includes(
            child.tagName
          )
      ) {
        return;
      }

      child.classList.add(
        "link-v3-original-hidden"
      );
    });

    /*
     * Move actual account functionality into new story.
     */

    if (accountSection) {

      accountSection.classList.remove(
        "link-v3-original-hidden"
      );

      accountSection.removeAttribute(
        "hidden"
      );

      document
        .getElementById(
          "linkV3AccountMount"
        )
        .appendChild(
          accountSection
        );
    } else {

      document
        .getElementById(
          "linkV3AccountMount"
        )
        .innerHTML = `
          <div class="b3-plan">
            <strong>
              Business account access is temporarily
              unavailable in this presentation.
            </strong>
          </div>
        `;
    }

    /*
     * Start Free and Sign In buttons reuse
     * the EXISTING account control.
     */

    $all("[data-b3-new]")
      .forEach(button => {

        button.addEventListener(
          "click",
          function () {

            window.setTimeout(
              () =>
                activateAccountMode(
                  "new"
                ),
              250
            );
          }
        );
      });

    $all("[data-b3-signin]")
      .forEach(button => {

        button.addEventListener(
          "click",
          function () {

            window.setTimeout(
              () =>
                activateAccountMode(
                  "signin"
                ),
              250
            );
          }
        );
      });

    /*
     * Shared site navigation remains canonical.
     * Only hide extra full duplicate nav systems.
     */

    window.setTimeout(
      removeDuplicateNavigation,
      450
    );

    installMotion();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      build
    );
  } else {
    build();
  }

})();
