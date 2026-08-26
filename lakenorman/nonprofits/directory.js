(function () {
  "use strict";

  var state = {
    organizations: [],
    filtered: [],
    map: null,
    markers: []
  };

  var search =
    document.getElementById(
      "directorySearch"
    );

  var area =
    document.getElementById(
      "directoryArea"
    );

  var grid =
    document.getElementById(
      "directoryGrid"
    );

  var status =
    document.getElementById(
      "directoryStatus"
    );

  var count =
    document.getElementById(
      "directoryCount"
    );

  var mapped =
    document.getElementById(
      "directoryMapped"
    );


  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function normalizeDatabaseOrg(row) {
    return {
      source: "database",

      id: row.id,

      name:
        row.display_name ||
        "",

      website:
        row.website_url ||
        "",

      publicEmail:
        row.public_email ||
        "",

      publicPhone:
        row.public_phone ||
        "",

      mission:
        row.mission ||
        "",

      category:
        row.category ||
        "",

      whoTheyServe:
        row.who_they_serve ||
        "",

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
        row.city ||
        "",

      latitude:
        row.latitude === null
          ? null
          : Number(row.latitude),

      longitude:
        row.longitude === null
          ? null
          : Number(row.longitude),

      logo:
        row.logo_url ||
        null,

      serviceAreas:
        (
          row.service_areas ||
          []
        ).map(
          item =>
            item.name
        ),

      needs:
        row.needs || [],

      opportunities:
        row.opportunities || [],

      events:
        row.events || [],

      verified: true,

      locatedInServiceArea:
        Boolean(
          row.located_in_service_area
        ),

      servesServiceArea:
        Boolean(
          row.serves_service_area
        )
    };
  }


  function normalizeLegacyOrg(org) {
    return {
      source: "legacy",

      id:
        org.id ||
        "",

      name:
        org.name ||
        "",

      website:
        org.website ||
        "",

      publicEmail: "",
      publicPhone: "",

      mission:
        org.mission ||
        "",

      category:
        org.category ||
        "",

      whoTheyServe: "",

      address: "",
      city: "",

      latitude: null,
      longitude: null,

      logo:
        org.logo ||
        null,

      serviceAreas: [],

      needs:
        org.needs ||
        [],

      opportunities:
        org.opportunities ||
        [],

      events: [],

      verified:
        org.active === true &&
        org.verificationStatus ===
          "official-site-verified",

      locatedInServiceArea: null,
      servesServiceArea: true
    };
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
          return (
            org.active === true &&
            org.verificationStatus ===
              "official-site-verified"
          );
        }
      )
      .map(normalizeLegacyOrg);
  }


  async function loadOrganizations() {
    var databaseRows = [];

    try {
      var response =
        await fetch(
          "/api/nonprofits/public"
        );

      if (response.ok) {
        var data =
          await response.json();

        databaseRows =
          (
            data.organizations ||
            []
          ).map(
            normalizeDatabaseOrg
          );
      }

    } catch (error) {
      console.warn(
        "LINK directory API unavailable:",
        error
      );
    }

    var legacy =
      legacyFallback();

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
      function (org) {
        byName.set(
          org.name
            .toLowerCase()
            .trim(),
          org
        );
      }
    );

    state.organizations =
      Array.from(
        byName.values()
      ).sort(
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
        org.serviceAreas.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(query)) {
        return false;
      }
    }

    if (selectedArea) {
      var areas =
        org.serviceAreas.map(
          function (name) {
            return String(name)
              .toLowerCase();
          }
        );

      if (
        areas.length &&
        !areas.includes(
          selectedArea
        )
      ) {
        return false;
      }

      if (
        !areas.length &&
        org.source === "database"
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


  function chips(items) {
    if (!items.length) {
      return "";
    }

    return (
      '<div class="directory-chips">' +
      items
        .map(
          function (item) {
            return (
              "<span>" +
              esc(item) +
              "</span>"
            );
          }
        )
        .join("") +
      "</div>"
    );
  }


  function actionCount(org) {
    return (
      org.needs.length +
      org.opportunities.length +
      org.events.length
    );
  }


  function card(org) {
    var locationLabel = "";

    if (
      org.source === "database"
    ) {
      locationLabel =
        org.locatedInServiceArea
          ? "Located + Serving Lake Norman"
          : "Verified Lake Norman Service";
    } else {
      locationLabel =
        "Verified LINK Organization";
    }

    var websiteAction =
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
        : "";

    var logo =
      org.logo
        ? (
            '<img src="' +
            esc(org.logo) +
            '" alt="' +
            esc(org.name) +
            ' logo">'
          )
        : (
            '<div class="directory-logo-fallback">' +
            esc(
              org.name
                .charAt(0)
                .toUpperCase()
            ) +
            "</div>"
          );

    return (
      '<article class="directory-card">' +

        '<div class="directory-card-logo">' +
          logo +
        "</div>" +

        '<div class="directory-card-body">' +

          '<span class="directory-verified">' +
            "✓ " +
            esc(locationLabel) +
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
                  "<p>" +
                    esc(org.mission) +
                  "</p>"
                )
              : ""
          ) +

          chips(
            org.serviceAreas
          ) +

          (
            actionCount(org)
              ? (
                  '<div class="directory-action-count">' +
                    actionCount(org) +
                    " active need" +
                    (
                      actionCount(org) === 1
                        ? ""
                        : "s"
                    ) +
                    " / opportunity records" +
                  "</div>"
                )
              : ""
          ) +

        "</div>" +

        '<div class="directory-card-footer">' +
          websiteAction +
        "</div>" +

      "</article>"
    );
  }


  function renderDirectory() {
    if (!grid) {
      return;
    }

    count.textContent =
      String(
        state.filtered.length
      );

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

    mapped.textContent =
      String(mappedCount);

    if (!state.filtered.length) {
      status.hidden = false;

      status.textContent =
        "No organizations match those filters.";

      grid.innerHTML = "";
      return;
    }

    status.hidden = true;

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

    state.map =
      L.map(
        "nonprofitMap",
        {
          scrollWheelZoom: false
        }
      ).setView(
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
    ).addTo(state.map);
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

        var marker =
          L.marker([
            org.latitude,
            org.longitude
          ])
            .addTo(state.map)
            .bindPopup(
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
                org.website
                  ? (
                      '<br><a href="' +
                      esc(org.website) +
                      '" target="_blank" rel="noopener noreferrer">Website</a>'
                    )
                  : ""
              )
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

  loadOrganizations();
})();
