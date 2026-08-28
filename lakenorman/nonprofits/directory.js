(function () {
  "use strict";

  var state = {
    organizations: [],
    filtered: [],
    map: null,
    markers: []
  };

  var search =
    document.getElementById("directorySearch");

  var area =
    document.getElementById("directoryArea");

  var grid =
    document.getElementById("directoryGrid");

  var status =
    document.getElementById("directoryStatus");

  var count =
    document.getElementById("directoryCount");

  var mapped =
    document.getElementById("directoryMapped");


  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function finite(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    var number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }


  function normalizeLogo(value) {
    if (!value) {
      return null;
    }

    var url = String(value).trim();

    if (url.indexOf("./assets/logos/") === 0) {
      url = "/lakenorman/assets/logos/" + url.slice("./assets/logos/".length);
    } else if (url.indexOf("assets/logos/") === 0) {
      url = "/lakenorman/assets/logos/" + url.slice("assets/logos/".length);
    }

    if (url.indexOf("/lakenorman/assets/logos/") === 0 && url.indexOf("?") === -1) {
      url += "?v=20260828-directory-logo4";
    }

    return url;
  }


  function normalizeDatabaseOrg(row) {
    return {
      source: "database",

      id: row.id || "",

      name:
        row.display_name ||
        row.name ||
        "",

      website:
        row.website_url ||
        row.website ||
        "",

      publicEmail:
        row.public_email || "",

      publicPhone:
        row.public_phone || "",

      mission:
        row.mission || "",

      category:
        row.category || "",

      whoTheyServe:
        row.who_they_serve || "",

      address:
        [
          row.address_line1,
          row.address_line2,
          row.city,
          row.state,
          row.postal_code
        ]
          .filter(Boolean)
          .join(", "),

      city:
        row.city || "",

      latitude:
        finite(row.latitude),

      longitude:
        finite(row.longitude),

      logo:
        normalizeLogo(
          row.logo_url ||
          row.logo
        ),

      serviceAreas:
        Array.isArray(row.service_areas)
          ? row.service_areas.map(
              function (item) {
                return (
                  item.name ||
                  item.area_name ||
                  item
                );
              }
            )
          : [],

      needs:
        Array.isArray(row.needs)
          ? row.needs
          : [],

      opportunities:
        Array.isArray(row.opportunities)
          ? row.opportunities
          : [],

      events:
        Array.isArray(row.events)
          ? row.events
          : [],

      verified: true,

      verificationStatus:
        row.verification_status ||
        "official-site-verified",

      locatedInServiceArea:
        Boolean(
          row.located_in_service_area
        ),

      servesServiceArea:
        row.serves_service_area !== false
    };
  }


  function normalizeLegacyOrg(org) {
    return {
      source: "legacy",

      id:
        org.id || "",

      name:
        org.name || "",

      website:
        org.website || "",

      publicEmail:
        org.publicEmail ||
        org.public_email ||
        "",

      publicPhone:
        org.publicPhone ||
        org.public_phone ||
        "",

      mission:
        org.mission || "",

      category:
        org.category || "",

      whoTheyServe:
        org.whoTheyServe || "",

      address:
        org.address || "",

      city:
        org.city || "",

      latitude:
        finite(org.latitude),

      longitude:
        finite(org.longitude),

      logo:
        normalizeLogo(org.logo),

      serviceAreas:
        Array.isArray(org.serviceAreas)
          ? org.serviceAreas
          : [],

      needs:
        Array.isArray(org.needs)
          ? org.needs
          : [],

      opportunities:
        Array.isArray(org.opportunities)
          ? org.opportunities
          : [],

      events:
        Array.isArray(org.events)
          ? org.events
          : [],

      verified:
        org.verificationStatus ===
        "official-site-verified",

      verificationStatus:
        org.verificationStatus || "",

      locatedInServiceArea:
        null,

      servesServiceArea:
        true
    };
  }


  /*
   * IMPORTANT:
   * Database data supplements the current LINK registry.
   * Blank API fields must NOT erase existing logos,
   * coordinates, missions, needs or opportunities.
   */
  function mergeOrganization(
    legacy,
    database
  ) {
    if (!legacy) {
      return database;
    }

    if (!database) {
      return legacy;
    }

    return {
      source: "merged",

      id:
        database.id ||
        legacy.id,

      name:
        database.name ||
        legacy.name,

      website:
        database.website ||
        legacy.website,

      publicEmail:
        database.publicEmail ||
        legacy.publicEmail,

      publicPhone:
        database.publicPhone ||
        legacy.publicPhone,

      mission:
        database.mission ||
        legacy.mission,

      category:
        database.category ||
        legacy.category,

      whoTheyServe:
        database.whoTheyServe ||
        legacy.whoTheyServe,

      address:
        database.address ||
        legacy.address,

      city:
        database.city ||
        legacy.city,

      latitude:
        Number.isFinite(
          database.latitude
        )
          ? database.latitude
          : legacy.latitude,

      longitude:
        Number.isFinite(
          database.longitude
        )
          ? database.longitude
          : legacy.longitude,

      logo:
        database.logo ||
        legacy.logo,

      serviceAreas:
        database.serviceAreas.length
          ? database.serviceAreas
          : legacy.serviceAreas,

      needs:
        database.needs.length
          ? database.needs
          : legacy.needs,

      opportunities:
        database.opportunities.length
          ? database.opportunities
          : legacy.opportunities,

      events:
        database.events.length
          ? database.events
          : legacy.events,

      verified:
        database.verified ||
        legacy.verified,

      verificationStatus:
        database.verificationStatus ||
        legacy.verificationStatus,

      locatedInServiceArea:
        database.locatedInServiceArea,

      servesServiceArea:
        database.servesServiceArea !== false
    };
  }


  /*
   * LINK REGISTRY ENRICHMENT
   *
   * The Lake Norman registry remains authoritative for
   * established organization logos, needs/opportunities
   * and verified map coordinates.
   *
   * Database/API information can supplement these records
   * but must not erase richer existing public information.
   */

  function registryKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  function registryMap() {
    var registry =
      Array.isArray(
        window.LINK_ORGANIZATIONS
      )
        ? window.LINK_ORGANIZATIONS
        : [];

    var map = new Map();

    registry
      .filter(
        function (org) {
          return org.active === true;
        }
      )
      .forEach(
        function (org) {
          [
            org.name,
            org.id,
            org.slug
          ]
            .filter(Boolean)
            .forEach(
              function (value) {
                map.set(
                  registryKey(value),
                  org
                );
              }
            );
        }
      );

    return map;
  }


  function enrichFromRegistry(org) {
    var registry =
      registryMap();

    var legacy =
      registry.get(
        registryKey(org.name)
      ) ||
      registry.get(
        registryKey(org.id)
      );

    if (!legacy) {
      return org;
    }


    /*
     * FORCE known LINK logo whenever registry has one.
     */
    if (legacy.logo) {
      org.logo =
        normalizeLogo(
          legacy.logo
        );
    }


    /*
     * FORCE verified stored coordinates whenever present.
     */
    var lat =
      finite(
        legacy.latitude
      );

    var lng =
      finite(
        legacy.longitude
      );

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      org.latitude = lat;
      org.longitude = lng;

      org.address =
        legacy.address ||
        org.address ||
        "";

      org.city =
        legacy.city ||
        org.city ||
        "";
    }


    /*
     * Preserve established mission/category.
     */
    if (legacy.mission) {
      org.mission =
        legacy.mission;
    }

    if (legacy.category) {
      org.category =
        legacy.category;
    }


    /*
     * Preserve ALL registry needs/opportunities.
     */
    if (
      Array.isArray(
        legacy.needs
      ) &&
      legacy.needs.length
    ) {
      org.needs =
        legacy.needs;
    }

    if (
      Array.isArray(
        legacy.opportunities
      ) &&
      legacy.opportunities.length
    ) {
      org.opportunities =
        legacy.opportunities;
    }


    return org;
  }


  function legacyFallback() {
    var registry =
      Array.isArray(
        window.LINK_ORGANIZATIONS
      )
        ? window.LINK_ORGANIZATIONS
        : [];

    return registry
      .filter(
        function (org) {
          return org.active === true;
        }
      )
      .map(normalizeLegacyOrg);
  }


  async function loadOrganizations() {
    var legacy =
      legacyFallback();

    var databaseRows = [];

    try {
      var response =
        await fetch(
          "/api/nonprofits/public",
          {
            headers: {
              Accept: "application/json"
            }
          }
        );

      var contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        response.ok &&
        contentType.includes(
          "application/json"
        )
      ) {
        var data =
          await response.json();

        databaseRows =
          Array.isArray(
            data.organizations
          )
            ? data.organizations.map(
                normalizeDatabaseOrg
              )
            : [];
      }

    } catch (error) {
      console.warn(
        "LINK directory API unavailable; using registry.",
        error
      );
    }


    var byName =
      new Map();


    legacy.forEach(
      function (org) {
        byName.set(
          org.name
            .toLowerCase()
            .trim(),
          org
        );
      }
    );


    databaseRows.forEach(
      function (databaseOrg) {
        var key =
          databaseOrg.name
            .toLowerCase()
            .trim();

        var legacyOrg =
          byName.get(key);

        byName.set(
          key,
          mergeOrganization(
            legacyOrg,
            databaseOrg
          )
        );
      }
    );


    state.organizations =
      Array.from(
        byName.values()
      )
        .map(
          enrichFromRegistry
        )
        .filter(
          function (org) {
            return Boolean(
              org.name
            );
          }
        )
        .sort(
          function (a, b) {
            return a.name.localeCompare(
              b.name
            );
          }
        );

    applyFilters();
  }


  function matches(org) {
    var query =
      search
        ? search.value
            .toLowerCase()
            .trim()
        : "";

    var selectedArea =
      area
        ? area.value
            .toLowerCase()
            .trim()
        : "";

    if (query) {
      var text = [
        org.name,
        org.mission,
        org.category,
        org.whoTheyServe,
        org.city,
        org.address,
        org.serviceAreas.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(query)) {
        return false;
      }
    }


    if (selectedArea) {
      var locationText = [
        org.city,
        org.address,
        org.serviceAreas.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      if (
        !locationText.includes(
          selectedArea
        )
      ) {
        return false;
      }
    }

    return true;
  }


  function applyFilters() {
    state.filtered =
      state.organizations.filter(
        matches
      );

    renderDirectory();
    renderMap();
  }


  function actionCount(org) {
    return (
      org.needs.length +
      org.opportunities.length +
      org.events.length
    );
  }


  function itemLink(item) {
    return (
      item.url ||
      item.link ||
      item.actionUrl ||
      item.action_url ||
      item.sourceUrl ||
      item.source_url ||
      ""
    );
  }


  function actionItem(
    item,
    label
  ) {
    var title =
      item.title ||
      item.name ||
      label;

    var description =
      item.description ||
      item.details ||
      "";

    var link =
      itemLink(item);

    return (
      '<div class="directory-action-item">' +

        '<span class="directory-action-type">' +
          esc(label) +
        "</span>" +

        "<strong>" +
          esc(title) +
        "</strong>" +

        (
          description
            ? (
                "<p>" +
                  esc(description) +
                "</p>"
              )
            : ""
        ) +

        (
          link
            ? (
                '<a href="' +
                esc(link) +
                '" target="_blank" ' +
                'rel="noopener noreferrer">' +
                "LEARN MORE →" +
                "</a>"
              )
            : ""
        ) +

      "</div>"
    );
  }


  function actionDetails(org) {
    var items = [];

    org.needs.forEach(
      function (item) {
        items.push(
          actionItem(
            item,
            "NEED"
          )
        );
      }
    );

    org.opportunities.forEach(
      function (item) {
        items.push(
          actionItem(
            item,
            "OPPORTUNITY"
          )
        );
      }
    );

    org.events.forEach(
      function (item) {
        items.push(
          actionItem(
            item,
            "EVENT"
          )
        );
      }
    );


    if (!items.length) {
      return (
        '<div class="directory-no-actions">' +
        "Current needs and opportunities are being updated." +
        "</div>"
      );
    }


    return (
      '<details class="directory-actions-detail">' +

        "<summary>" +
          '<span>VIEW NEEDS &amp; OPPORTUNITIES</span>' +
          "<b>" +
            items.length +
          "</b>" +
        "</summary>" +

        '<div class="directory-action-list">' +
          items.join("") +
        "</div>" +

      "</details>"
    );
  }


  function logoMarkup(org) {

    /*
     * REAL LOGO:
     * render the nonprofit logo only.
     * No initial circle is generated beside it.
     */
    if (org.logo) {
      return (
        '<img ' +
          'src="' +
          esc(org.logo) +
          '" ' +
          'alt="' +
          esc(org.name) +
          ' logo" ' +
          'loading="lazy">' 
      );
    }


    /*
     * NO LOGO:
     * use a simple text placeholder.
     * Never use the circular initial treatment.
     */
    return (
      '<div class="directory-logo-name-fallback">' +
        esc(org.name) +
      "</div>"
    );
  }


  function statusLabel(org) {
    if (org.verified) {
      return "✓ Verified LINK Organization";
    }

    return "LINK Community Organization";
  }


  function card(org) {
    var actions =
      actionCount(org);

    return (
      '<article class="directory-card">' +

        '<div class="directory-card-logo">' +
          logoMarkup(org) +
        "</div>" +

        '<div class="directory-card-body">' +

          '<span class="directory-verified">' +
            esc(
              statusLabel(org)
            ) +
          "</span>" +

          "<h3>" +
            esc(org.name) +
          "</h3>" +

          (
            org.category
              ? (
                  '<div class="directory-category">' +
                    esc(org.category) +
                  "</div>"
                )
              : ""
          ) +

          (
            org.mission
              ? (
                  '<p class="directory-mission">' +
                    esc(org.mission) +
                  "</p>"
                )
              : (
                  '<p class="directory-mission directory-mission-muted">' +
                  "Organization profile details are being updated." +
                  "</p>"
                )
          ) +

          (
            org.address
              ? (
                  '<div class="directory-location">' +
                    "⌖ " +
                    esc(org.address) +
                  "</div>"
                )
              : ""
          ) +

          (
            actions
              ? (
                  '<div class="directory-action-count">' +
                    actions +
                    " CURRENT NEED" +
                    (
                      actions === 1
                        ? ""
                        : "S"
                    ) +
                    " / OPPORTUNITIES" +
                  "</div>"
                )
              : ""
          ) +

          actionDetails(org) +

        "</div>" +

        '<div class="directory-card-footer">' +

          (
            org.website
              ? (
                  '<a class="directory-primary" ' +
                  'href="' +
                  esc(org.website) +
                  '" target="_blank" ' +
                  'rel="noopener noreferrer">' +
                    "VISIT WEBSITE →" +
                  "</a>"
                )
              : (
                  '<span class="directory-site-unavailable">' +
                    "Website update in progress" +
                  "</span>"
                )
          ) +

        "</div>" +

      "</article>"
    );
  }


  function renderDirectory() {
    if (!grid) {
      return;
    }

    if (count) {
      count.textContent =
        String(
          state.filtered.length
        );
    }


    var mappedCount =
      state.filtered.filter(
        function (org) {
          return (
            Number.isFinite(
              org.latitude
            ) &&
            Number.isFinite(
              org.longitude
            )
          );
        }
      ).length;


    if (mapped) {
      mapped.textContent =
        String(mappedCount);
    }


    if (!state.filtered.length) {
      if (status) {
        status.hidden = false;
        status.textContent =
          "No organizations match those filters.";
      }

      grid.innerHTML = "";
      return;
    }


    if (status) {
      status.hidden = true;
    }


    grid.innerHTML =
      state.filtered
        .map(card)
        .join("");
  }


  function initMap() {
    if (
      !window.L ||
      state.map
    ) {
      return;
    }


    var element =
      document.getElementById(
        "nonprofitMap"
      );

    if (!element) {
      return;
    }


    state.map =
      L.map(
        element,
        {
          scrollWheelZoom: false
        }
      )
        .setView(
          [35.4804, -80.8660],
          10
        );


    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    )
      .addTo(
        state.map
      );


    setTimeout(
      function () {
        state.map.invalidateSize();
      },
      100
    );
  }


  function renderMap() {
    initMap();

    if (!state.map) {
      return;
    }


    state.markers.forEach(
      function (marker) {
        marker.remove();
      }
    );

    state.markers = [];

    var bounds = [];


    state.filtered.forEach(
      function (org) {
        if (
          !Number.isFinite(
            org.latitude
          ) ||
          !Number.isFinite(
            org.longitude
          )
        ) {
          return;
        }


        var popupLogo =
          org.logo
            ? (
                '<img src="' +
                esc(org.logo) +
                '" alt="" ' +
                'style="' +
                  "display:block;" +
                  "max-width:100px;" +
                  "max-height:42px;" +
                  "object-fit:contain;" +
                  "margin:0 0 8px;" +
                '">' 
              )
            : "";


        var popup =
          popupLogo +

          "<strong>" +
            esc(org.name) +
          "</strong>" +

          (
            org.category
              ? (
                  "<br>" +
                  esc(org.category)
                )
              : ""
          ) +

          (
            org.address
              ? (
                  "<br><small>" +
                    esc(org.address) +
                  "</small>"
                )
              : ""
          ) +

          (
            org.website
              ? (
                  '<br><a href="' +
                  esc(org.website) +
                  '" target="_blank" ' +
                  'rel="noopener noreferrer">' +
                    "Visit website" +
                  "</a>"
                )
              : ""
          );


        var marker =
          L.marker([
            org.latitude,
            org.longitude
          ])
            .addTo(
              state.map
            )
            .bindPopup(
              popup
            );


        state.markers.push(
          marker
        );

        bounds.push([
          org.latitude,
          org.longitude
        ]);
      }
    );


    if (bounds.length === 1) {
      state.map.setView(
        bounds[0],
        12
      );

    } else if (bounds.length > 1) {

      state.map.fitBounds(
        bounds,
        {
          padding: [35, 35],
          maxZoom: 12
        }
      );

    } else {

      state.map.setView(
        [35.4804, -80.8660],
        10
      );
    }


    setTimeout(
      function () {
        state.map.invalidateSize();
      },
      100
    );
  }


  if (search) {
    search.addEventListener(
      "input",
      applyFilters
    );
  }


  if (area) {
    area.addEventListener(
      "change",
      applyFilters
    );
  }


  window.addEventListener(
    "resize",
    function () {
      if (state.map) {
        state.map.invalidateSize();
      }
    }
  );


  loadOrganizations();

})();
