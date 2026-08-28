(function () {
  "use strict";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function key(value) {
    return clean(value)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function esc(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeUrl(value) {
    var url = clean(value);

    return /^https?:\/\//i.test(url)
      ? url
      : "";
  }

  function legacyOrganizations() {
    return Array.isArray(window.LINK_ORGANIZATIONS)
      ? window.LINK_ORGANIZATIONS
      : [];
  }

  function legacyMap() {
    var map = new Map();

    legacyOrganizations().forEach(function (org) {
      var name = clean(org.name);

      if (!name) return;

      map.set(
        key(name),
        {
          name: name,
          website: clean(org.website),
          logo: clean(org.logo),
          category: clean(org.category),
          needs: Array.isArray(org.needs)
            ? org.needs
            : [],
          opportunities: Array.isArray(org.opportunities)
            ? org.opportunities
            : []
        }
      );
    });

    return map;
  }

  function mergeOrganizations(apiOrganizations) {
    var map = legacyMap();

    (apiOrganizations || []).forEach(function (org) {
      var name = clean(
        org.display_name ||
        org.name
      );

      if (!name) return;

      var id = key(name);
      var current = map.get(id) || {};

      map.set(
        id,
        {
          name: name,
          website:
            clean(org.website_url) ||
            clean(org.website) ||
            clean(current.website),

          logo:
            clean(org.logo_url) ||
            clean(org.logo) ||
            clean(current.logo),

          category:
            clean(org.category) ||
            clean(current.category),

          needs:
            (
              Array.isArray(org.needs) &&
              org.needs.length
            )
              ? org.needs
              : (
                  Array.isArray(current.needs)
                    ? current.needs
                    : []
                ),

          opportunities:
            (
              Array.isArray(org.opportunities) &&
              org.opportunities.length
            )
              ? org.opportunities
              : (
                  Array.isArray(current.opportunities)
                    ? current.opportunities
                    : []
                )
        }
      );
    });

    return Array.from(map.values())
      .sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
  }

  function renderPartnerRail(organizations) {
    var rail =
      document.getElementById("partnerRail");

    if (!rail) return;

    rail.innerHTML =
      organizations
        .map(function (org) {
          var href =
            safeUrl(org.website) ||
            "/lakenorman/nonprofits/";

          var external =
            /^https?:\/\//i.test(href);

          var visual =
            org.logo
              ? (
                  '<img src="' +
                  esc(org.logo) +
                  '" alt="' +
                  esc(org.name) +
                  ' logo" loading="lazy" decoding="async">'
                )
              : (
                  '<span class="launch-logo-placeholder">' +
                  esc(org.name.charAt(0)) +
                  '</span>'
                );

          return (
            '<a class="partner-cell launch-partner-cell" ' +
            'href="' +
            esc(href) +
            '"' +
            (
              external
                ? ' target="_blank" rel="noopener noreferrer"'
                : ''
            ) +
            '>' +
              visual +
              '<span class="partner-name">' +
                esc(org.name) +
              '</span>' +
            '</a>'
          );
        })
        .join("");

    console.info(
      "LINK nonprofit partner wall:",
      organizations.length
    );
  }

  async function init() {
    var apiOrganizations = [];

    try {
      var response =
        await fetch(
          "/api/nonprofits/public",
          {
            cache: "no-store",
            headers: {
              Accept: "application/json"
            }
          }
        );

      if (response.ok) {
        var payload =
          await response.json();

        apiOrganizations =
          Array.isArray(payload.organizations)
            ? payload.organizations
            : [];
      }
    }
    catch (error) {
      console.warn(
        "Live nonprofit API unavailable; using registry.",
        error
      );
    }

    renderPartnerRail(
      mergeOrganizations(
        apiOrganizations
      )
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        window.setTimeout(init, 75);
      },
      { once: true }
    );
  }
  else {
    window.setTimeout(init, 75);
  }
})();
