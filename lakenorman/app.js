(function () {
  "use strict";


  /* ========================================================
     BASIC UTILITIES
     ======================================================== */

  function esc(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function clean(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).trim();

  }


  function firstValue() {

    for (
      var i = 0;
      i < arguments.length;
      i++
    ) {

      var value = arguments[i];

      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return value;
      }

    }

    return "";

  }


  function firstArray() {

    for (
      var i = 0;
      i < arguments.length;
      i++
    ) {

      if (
        Array.isArray(arguments[i]) &&
        arguments[i].length
      ) {
        return arguments[i];
      }

    }

    return [];

  }



  /* ========================================================
     FIND THE CANONICAL ORGANIZATION REGISTRY
     ======================================================== */

  function sourceOrganizations() {

    /*
     * Support all registry forms used during this build.
     */

    if (
      typeof LINK_ORGANIZATIONS !== "undefined" &&
      Array.isArray(LINK_ORGANIZATIONS)
    ) {
      return LINK_ORGANIZATIONS;
    }


    if (
      Array.isArray(
        window.LINK_ORGANIZATIONS
      )
    ) {
      return window.LINK_ORGANIZATIONS;
    }


    if (
      Array.isArray(
        window.organizations
      )
    ) {
      return window.organizations;
    }


    if (
      Array.isArray(
        window.LINK_ORGANIZATION_REGISTRY
      )
    ) {
      return window.LINK_ORGANIZATION_REGISTRY;
    }


    console.error(
      "LINK organization registry was not found."
    );

    return [];

  }



  /* ========================================================
     VERIFIED ORGANIZATIONS
     ======================================================== */

  function isVerifiedOrganization(org) {

    var status = clean(
      firstValue(
        org.verificationStatus,
        org.verification,
        org.status
      )
    ).toLowerCase();


    return (
      org.active === true &&
      (
        status === "official-site-verified" ||
        status === "verified" ||
        org.officialSiteVerified === true
      )
    );

  }


  function verifiedOrganizations() {

    return sourceOrganizations()
      .filter(isVerifiedOrganization);

  }



  /* ========================================================
     ORGANIZATION IDENTITY
     ======================================================== */

  function organizationId(org, index) {

    return clean(
      firstValue(
        org.id,
        org.slug,
        org.organizationId,
        "organization-" + index
      )
    );

  }


  function organizationName(org) {

    return clean(
      firstValue(
        org.name,
        org.organizationName,
        org.title
      )
    );

  }


  function organizationMission(org) {

    return clean(
      firstValue(
        org.mission,
        org.missionStatement,
        org.description,
        org.summary
      )
    );

  }


  function organizationWebsite(org) {

    return clean(
      firstValue(
        org.website,
        org.websiteUrl,
        org.url,
        org.officialWebsite
      )
    );

  }


  function organizationLogo(org) {

    return clean(
      firstValue(
        org.logo,
        org.logoPath,
        org.logoUrl,
        org.logoFile,
        org.assetPath
      )
    );

  }



  /* ========================================================
     NORMALIZE NEED / OPPORTUNITY RECORDS
     ======================================================== */

  function normalizeItem(
    raw,
    org,
    index,
    defaultType
  ) {

    if (
      raw === null ||
      raw === undefined
    ) {
      return null;
    }


    /*
     * Simple string needs are allowed.
     */

    if (
      typeof raw === "string"
    ) {

      return {

        id:
          organizationId(org, 0) +
          "-item-" +
          index,

        title:
          raw,

        description:
          organizationMission(org),

        type:
          defaultType ||
          "Community Need",

        actionUrl:
          organizationWebsite(org),

        verified:
          true

      };

    }


    if (
      typeof raw !== "object"
    ) {
      return null;
    }


    var status = clean(
      firstValue(
        raw.verificationStatus,
        raw.verification,
        raw.status
      )
    ).toLowerCase();


    var explicitlyUnverified =
      status === "unverified" ||
      status === "review-needed" ||
      status === "official-site-review-needed" ||
      raw.verified === false;


    if (explicitlyUnverified) {
      return null;
    }


    var title = clean(
      firstValue(
        raw.title,
        raw.name,
        raw.need,
        raw.opportunity,
        raw.headline,
        raw.label
      )
    );


    if (!title) {
      return null;
    }


    return {

      id:
        clean(
          firstValue(
            raw.id,
            raw.slug,
            organizationId(org, 0) +
              "-item-" +
              index
          )
        ),

      title:
        title,

      description:
        clean(
          firstValue(
            raw.description,
            raw.details,
            raw.summary,
            raw.needDescription,
            raw.opportunityDescription,
            organizationMission(org)
          )
        ),

      type:
        clean(
          firstValue(
            raw.type,
            raw.category,
            raw.opportunityType,
            raw.needType,
            defaultType,
            "Opportunity"
          )
        ),

      actionUrl:
        clean(
          firstValue(
            raw.actionUrl,
            raw.url,
            raw.link,
            raw.applyUrl,
            raw.donateUrl,
            raw.volunteerUrl,
            organizationWebsite(org)
          )
        ),

      verified:
        true

    };

  }



  /* ========================================================
     GET VERIFIED NEEDS / OPPORTUNITIES FOR ONE ORGANIZATION
     ======================================================== */

  function organizationItems(org) {

    var rows = [];


    var opportunityArrays = firstArray(
      org.opportunities,
      org.currentOpportunities,
      org.verifiedOpportunities,
      org.volunteerOpportunities,
      org.supportOpportunities
    );


    opportunityArrays.forEach(
      function (item, index) {

        var normalized =
          normalizeItem(
            item,
            org,
            index,
            "Opportunity"
          );

        if (normalized) {
          rows.push(normalized);
        }

      }
    );


    var needArrays = firstArray(
      org.needs,
      org.currentNeeds,
      org.verifiedNeeds,
      org.communityNeeds,
      org.activeNeeds
    );


    needArrays.forEach(
      function (item, index) {

        var normalized =
          normalizeItem(
            item,
            org,
            index,
            "Community Need"
          );

        if (normalized) {
          rows.push(normalized);
        }

      }
    );


    /*
     * Support single-object / single-string
     * fields created during verification.
     */

    var singles = [
      ["currentNeed", "Community Need"],
      ["featuredNeed", "Community Need"],
      ["need", "Community Need"],
      ["currentOpportunity", "Opportunity"],
      ["featuredOpportunity", "Opportunity"]
    ];


    singles.forEach(
      function (pair, index) {

        var value =
          org[pair[0]];


        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return;
        }


        var normalized =
          normalizeItem(
            value,
            org,
            100 + index,
            pair[1]
          );


        if (normalized) {
          rows.push(normalized);
        }

      }
    );


    /*
     * De-duplicate exact titles within
     * the same organization.
     */

    var seen = {};


    return rows.filter(
      function (item) {

        var key =
          item.title
            .trim()
            .toLowerCase();


        if (seen[key]) {
          return false;
        }


        seen[key] = true;

        return true;

      }
    );

  }



  /* ========================================================
     FEATURED HOMEPAGE OPPORTUNITY ROWS
     ======================================================== */

  function featuredRows() {

    /*
     * Homepage editorial selection.
     *
     * RULE:
     * - organization must be active
     * - organization must be official-site-verified
     * - card content must come from that same canonical record
     * - matched logo is preferred for homepage presentation
     *
     * This controls homepage placement only.
     * It does not remove any other organization from the registry.
     */

    var featuredIds = [
      "caterpillar-ministries",
      "go-jen-go-foundation",
      "habitat-for-humanity-of-the-charlotte-region",
      "homes-for-heroes-foundation"
    ];


    var verified =
      verifiedOrganizations();


    var rows = [];


    featuredIds.forEach(
      function (wantedId) {

        var org = verified.find(
          function (candidate, index) {

            return (
              organizationId(
                candidate,
                index
              ) === wantedId
            );

          }
        );


        /*
         * Handle an alternate canonical slug if the
         * organization ID was originally abbreviated.
         */
        if (!org) {

          org = verified.find(
            function (candidate) {

              var name =
                organizationName(candidate)
                  .toLowerCase();

              if (
                wantedId ===
                "go-jen-go-foundation"
              ) {
                return (
                  name ===
                  "go jen go foundation"
                );
              }

              if (
                wantedId ===
                "habitat-for-humanity-of-the-charlotte-region"
              ) {
                return (
                  name ===
                  "habitat for humanity of the charlotte region"
                );
              }

              if (
                wantedId ===
                "homes-for-heroes-foundation"
              ) {
                return (
                  name ===
                  "homes for heroes foundation"
                );
              }

              return false;

            }
          );

        }


        if (!org) {
          return;
        }


        var items =
          organizationItems(org);


        if (!items.length) {
          return;
        }


        /*
         * Prefer a volunteer / action opportunity.
         * Fall back to the first verified item.
         */
        var preferred =
          items.find(
            function (item) {

              var type =
                String(
                  item.type || ""
                ).toLowerCase();

              return (
                type.includes("volunteer") ||
                type.includes("service") ||
                type.includes("business") ||
                type.includes("partner")
              );

            }
          ) ||
          items[0];


        rows.push({

          organization:
            org,

          organizationId:
            organizationId(
              org,
              verified.indexOf(org)
            ),

          item:
            preferred

        });

      }
    );


    /*
     * Safety fallback:
     * If one curated organization has no current public item,
     * fill only from another verified organization with a logo.
     */
    if (rows.length < 4) {

      verified.forEach(
        function (org, index) {

          if (
            rows.length >= 4
          ) {
            return;
          }


          var id =
            organizationId(
              org,
              index
            );


          if (
            rows.some(
              function (row) {
                return (
                  row.organizationId === id
                );
              }
            )
          ) {
            return;
          }


          if (
            !organizationLogo(org)
          ) {
            return;
          }


          var items =
            organizationItems(org);


          if (!items.length) {
            return;
          }


          rows.push({

            organization:
              org,

            organizationId:
              id,

            item:
              items[0]

          });

        }
      );

    }


    return rows.slice(0,4);

  }



  /* ========================================================
     LOGO MARKUP
     ======================================================== */

  function logoMarkup(org) {

    var logo =
      organizationLogo(org);

    var name =
      organizationName(org);


    if (!logo) {

      return (
        '<span class="verified-logo-name">' +
        esc(name) +
        '</span>'
      );

    }


    return (
      '<img ' +
        'src="' +
        esc(logo) +
        '" ' +
        'alt="' +
        esc(name) +
        ' logo" ' +
        'onerror="' +
          "this.style.display='none';" +
          "this.nextElementSibling.style.display='block';" +
        '">' +

      '<span ' +
        'class="verified-logo-name" ' +
        'style="display:none">' +
        esc(name) +
      '</span>'
    );

  }



  /* ========================================================
     RENDER REAL NEEDS / OPPORTUNITIES
     ======================================================== */

  function renderOpportunities() {

    var container =
      document.getElementById(
        "verifiedOpportunityCards"
      );


    if (!container) {

      console.error(
        "verifiedOpportunityCards not found"
      );

      return;

    }


    var rows =
      featuredRows();


    console.log(
      "LINK verified homepage opportunities:",
      rows
    );


    if (!rows.length) {

      container.innerHTML =
        '<article class="verified-card">' +

          '<div class="verified-card-body">' +

            '<h3>' +
              'Verified opportunities coming soon' +
            '</h3>' +

            '<p>' +
              'Organization records are verified, but no current public need or opportunity fields were found in the registry.' +
            '</p>' +

          '</div>' +

        '</article>';

      return;

    }


    container.innerHTML =
      rows.map(
        function (row) {

          var org =
            row.organization;

          var item =
            row.item;

          var name =
            organizationName(org);

          var actionUrl =
            item.actionUrl ||
            organizationWebsite(org) ||
            "#";


          return (
            '<article class="verified-card">' +

              '<div class="verified-logo-wrap">' +

                '<span class="verified-type">' +
                  esc(item.type) +
                '</span>' +

                logoMarkup(org) +

              '</div>' +


              '<div class="verified-body">' +

                '<div class="verified-org-name">' +
                  esc(name) +
                '</div>' +

                '<h3>' +
                  esc(item.title) +
                '</h3>' +

                '<p>' +
                  esc(
                    item.description ||
                    organizationMission(org)
                  ) +
                '</p>' +


                '<div class="verified-actions">' +

                  '<button ' +
                    'type="button" ' +
                    'class="verified-details" ' +
                    'data-org="' +
                    esc(row.organizationId) +
                    '" ' +
                    'data-item="' +
                    esc(item.id) +
                    '">' +
                    'DETAILS' +
                  '</button>' +

                  '<a ' +
                    'href="' +
                    esc(actionUrl) +
                    '" ' +
                    'target="_blank" ' +
                    'rel="noopener noreferrer">' +
                    'TAKE ACTION →' +
                  '</a>' +

                '</div>' +

              '</div>' +

            '</article>'
          );

        }
      )
      .join("");

  }



  /* ========================================================
     RENDER VERIFIED COMMUNITY PARTNER LOGOS
     ======================================================== */

  function renderPartners() {

    var rail =
      document.getElementById(
        "partnerRail"
      );


    if (!rail) {

      console.error(
        "partnerRail not found"
      );

      return;

    }


    var organizations =
      verifiedOrganizations()
        .filter(
          function (org) {

            return Boolean(
              organizationLogo(org)
            );

          }
        )
        .sort(
          function (a, b) {

            return organizationName(a)
              .localeCompare(
                organizationName(b)
              );

          }
        );


    console.log(
      "LINK verified partner logos:",
      organizations.length
    );


    if (!organizations.length) {

      rail.innerHTML =
        '<div class="partner-cell">' +

          '<span class="partner-name">' +
            'Verified partner logos are being matched.' +
          '</span>' +

        '</div>';

      return;

    }


    rail.innerHTML =
      organizations
        .map(
          function (org) {

            var name =
              organizationName(org);

            var logo =
              organizationLogo(org);

            var website =
              organizationWebsite(org) ||
              "#";


            return (
              '<a ' +
                'class="partner-cell" ' +
                'href="' +
                esc(website) +
                '" ' +
                'target="_blank" ' +
                'rel="noopener noreferrer" ' +
                'title="' +
                esc(name) +
                '">' +

                '<img ' +
                  'src="' +
                  esc(logo) +
                  '" ' +
                  'alt="' +
                  esc(name) +
                  ' logo" ' +
                  'onerror="' +
                    "this.style.display='none';" +
                    "this.nextElementSibling.style.display='block';" +
                  '">' +

                '<span ' +
                  'class="partner-name" ' +
                  'style="display:none">' +
                  esc(name) +
                '</span>' +

              '</a>'
            );

          }
        )
        .join("");

  }



  /* ========================================================
     IMPACT COUNT
     ======================================================== */

  function renderCount() {

    var count =
      document.getElementById(
        "nonprofitCount"
      );


    if (count) {

      count.textContent =
        verifiedOrganizations().length;

    }

  }



  /* ========================================================
     LOOKUP FOR DETAILS MODAL
     ======================================================== */

  function findOrganizationById(id) {

    var orgs =
      verifiedOrganizations();


    for (
      var i = 0;
      i < orgs.length;
      i++
    ) {

      if (
        organizationId(
          orgs[i],
          i
        ) === id
      ) {
        return orgs[i];
      }

    }


    return null;

  }


  function findItem(org, itemId) {

    var items =
      organizationItems(org);


    return (
      items.find(
        function (item) {
          return item.id === itemId;
        }
      ) ||
      null
    );

  }



  /* ========================================================
     MODAL
     ======================================================== */

  function showModal(
    kicker,
    title,
    html
  ) {

    var backdrop =
      document.getElementById(
        "modalBackdrop"
      );


    if (!backdrop) {
      return;
    }


    var kickerEl =
      document.getElementById(
        "modalKicker"
      );

    var titleEl =
      document.getElementById(
        "modalTitle"
      );

    var contentEl =
      document.getElementById(
        "modalContent"
      );


    if (kickerEl) {
      kickerEl.textContent =
        kicker ||
        "LINK COMMUNITY HUB™";
    }


    if (titleEl) {
      titleEl.textContent =
        title ||
        "";
    }


    if (contentEl) {
      contentEl.innerHTML =
        html ||
        "";
    }


    backdrop.hidden =
      false;


    document.body.style.overflow =
      "hidden";

  }


  window.closeModal =
    function () {

      var backdrop =
        document.getElementById(
          "modalBackdrop"
        );


      if (backdrop) {
        backdrop.hidden = true;
      }


      document.body.style.overflow =
        "";

    };



  /* ========================================================
     HOMEPAGE MODAL ACTIONS
     ======================================================== */

  window.openAllNeeds =
    function () {

      var orgCount =
        verifiedOrganizations().length;

      var itemCount =
        0;


      verifiedOrganizations()
        .forEach(
          function (org) {

            itemCount +=
              organizationItems(org).length;

          }
        );


      showModal(
        "COMMUNITY NEEDS",
        "Real Needs. Real Opportunities.",

        '<p><strong>' +
        itemCount +
        '</strong> current need/opportunity records are connected to <strong>' +
        orgCount +
        '</strong> verified organizations in this build.</p>' +

        '<p>The expanded Community Needs marketplace will use these same canonical organization relationships so nonprofit names, logos, missions, needs and action links remain connected correctly.</p>'
      );

    };


  window.openPartnerModal =
    function () {

      var orgs =
        verifiedOrganizations();

      var logoCount =
        orgs.filter(
          function (org) {
            return Boolean(
              organizationLogo(org)
            );
          }
        ).length;


      showModal(
        "COMMUNITY PARTNERS",
        "Participating Organizations",

        '<p><strong>' +
        orgs.length +
        '</strong> organization records are currently verified.</p>' +

        '<p><strong>' +
        logoCount +
        '</strong> of those verified records currently have matched logo assets attached to their canonical organization record.</p>'
      );

    };


  window.openStudentModal =
    function () {

      showModal(
        "STUDENTS & SCHOOLS",
        "Connect Learning to Community",

        '<p>Students and schools can participate through service, mentoring, career exposure, leadership, skills-based projects and verified local opportunities.</p>'
      );

    };


  window.openBusinessModal =
    function () {

      showModal(
        "BUSINESS & COMMUNITY PARTNERS",
        "Put Your Team Into the Ecosystem",

        '<p>Businesses and community partners can contribute employees, expertise, sponsorship, mentoring, in-kind resources and sustained local support.</p>'
      );

    };


  window.openEventsModal =
    function () {

      showModal(
        "COMMUNITY EVENTS",
        "Come Together",

        '<p>LINK connects community events, nonprofit activities, leadership gatherings and local opportunities that bring people into meaningful relationships.</p>'
      );

    };


  window.openHowModal =
    function () {

      showModal(
        "THE LINK ECOSYSTEM",
        "A Living Ecosystem. Stronger Together.",

        '<p>Real needs connect to the right people and trusted organizations. Those relationships lead to action, measurable community impact and stronger long-term connections.</p>'
      );

    };


  window.openVolunteerHub =
    function () {

      showModal(
        "VOLUNTEER",
        "Give Time, Talent & Expertise",

        '<p>Volunteer opportunities may include individual service, teams, professional skills, mentoring, events, projects and recurring support.</p>'
      );

    };


  window.openSpotlights =
    function () {

      showModal(
        "COMMUNITY STORIES",
        "People & Organizations Behind the Impact",

        '<p>LINK spotlights participating nonprofits, community partners and people creating meaningful local impact.</p>'
      );

    };


  window.openResources =
    function () {

      showModal(
        "RESOURCES",
        "Tools & Community Support",

        '<p>Resources connect people and organizations to practical information, education, support and opportunities across the community.</p>'
      );

    };


  window.openCommunityStore =
    function () {

      showModal(
        "COMMUNITY STORE",
        "Support Local Impact",

        '<p>The Community Store is preserved as part of the broader LINK Community Hub™ platform functionality.</p>'
      );

    };


  window.openAllyBot =
    function () {

      showModal(
        "ALLY BOT™",
        "Find Where You Fit",

        '<p>Ally Bot™ is preserved as a platform tool to help people navigate organizations, needs, resources and ways to participate.</p>'
      );

    };


  window.openAdminInfo =
    function () {

      showModal(
        "ADMIN",
        "Manage the Community Hub",

        '<p>Administrative controls support organization records, verification, needs, opportunities, resources, media and public information.</p>'
      );

    };


  window.openPrivacyInfo =
    function () {

      showModal(
        "PRIVACY",
        "Privacy by Design",

        '<p>Public pages focus on organizations, resources and aggregate impact rather than exposing private participant information.</p>'
      );

    };


  window.openGovernanceInfo =
    function () {

      showModal(
        "GOVERNANCE",
        "Verified Information",

        '<p>Organization information, needs and opportunities are managed through canonical records and verification status.</p>'
      );

    };


  window.openPlatformRights =
    function () {

      showModal(
        "PLATFORM & IP",
        "LINK Community Hub™",

        '<p><strong>Owner:</strong> LINK Lake Norman, LLC</p>' +

        '<p>LINK Community Hub™ is the platform. Lake Norman is a community implementation of that platform.</p>' +

        '<p>Third-party names, logos, trademarks and organization-owned content remain the property of their respective owners.</p>'
      );

    };



  /* ========================================================
     SCROLL ACTIONS
     ======================================================== */

  window.scrollNeeds =
    function () {

      var element =
        document.getElementById(
          "discover"
        );


      if (element) {

        element.scrollIntoView({
          behavior:
            "smooth"
        });

      }

    };


  window.scrollGetInvolved =
    function () {

      var element =
        document.getElementById(
          "activate"
        );


      if (element) {

        element.scrollIntoView({
          behavior:
            "smooth"
        });

      }

    };



  /* ========================================================
     EVENTS
     ======================================================== */

  document.addEventListener(
    "click",
    function (event) {

      var details =
        event.target.closest(
          ".verified-details"
        );


      if (details) {

        var org =
          findOrganizationById(
            details.dataset.org
          );


        if (!org) {
          return;
        }


        var item =
          findItem(
            org,
            details.dataset.item
          );


        if (!item) {
          return;
        }


        var html =
          '<p><strong>' +
          esc(
            organizationName(org)
          ) +
          '</strong></p>' +

          '<p>' +
          esc(
            item.description ||
            organizationMission(org)
          ) +
          '</p>';


        var mission =
          organizationMission(org);


        if (mission) {

          html +=
            '<p><strong>Mission:</strong> ' +
            esc(mission) +
            '</p>';

        }


        showModal(
          organizationName(org),
          item.title,
          html
        );

      }


      if (
        event.target.id ===
        "modalBackdrop"
      ) {
        window.closeModal();
      }

    }
  );


  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key ===
        "Escape"
      ) {
        window.closeModal();
      }

    }
  );



  /* ========================================================
     BOOT
     ======================================================== */

  function boot() {

    var orgs =
      verifiedOrganizations();


    var totalItems = 0;


    orgs.forEach(
      function (org) {

        totalItems +=
          organizationItems(org).length;

      }
    );


    console.log(
      "===================================="
    );

    console.log(
      "LINK Community Hub renderer"
    );

    console.log(
      "Verified organizations:",
      orgs.length
    );

    console.log(
      "Verified need/opportunity records:",
      totalItems
    );

    console.log(
      "Organizations with logos:",
      orgs.filter(
        function (org) {
          return Boolean(
            organizationLogo(org)
          );
        }
      ).length
    );

    console.log(
      "===================================="
    );


    renderCount();

    renderOpportunities();

    renderPartners();

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();
