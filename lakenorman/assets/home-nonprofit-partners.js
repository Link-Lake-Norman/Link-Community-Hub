(function () {
  "use strict";

  var rail =
    document.getElementById(
      "partnerRail"
    );

  if (!rail) {
    return;
  }


  function clean(value) {
    return String(
      value == null
        ? ""
        : value
    ).trim();
  }


  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  function safeUrl(value) {
    var url =
      clean(value);

    if (
      /^https?:\/\//i.test(url)
    ) {
      return url;
    }

    return "";
  }


  function organizationName(org) {
    return clean(
      org.display_name ||
      org.name ||
      ""
    );
  }


  function organizationCard(org) {

    var name =
      organizationName(org);

    var logo =
      clean(
        org.logo_url ||
        org.logo ||
        ""
      );

    var website =
      safeUrl(
        org.website_url ||
        org.website ||
        ""
      );

    var destination =
      website ||
      "/lakenorman/nonprofits/";

    var image =
      logo
        ? (
          '<img src="' +
          escapeHtml(logo) +
          '" alt="' +
          escapeHtml(name) +
          ' logo" loading="lazy" decoding="async">'
        )
        : (
          '<span class="link-home-nonprofit-name-only">' +
          escapeHtml(name) +
          '</span>'
        );


    return (
      '<a class="partner-cell link-home-live-nonprofit" ' +
      'href="' +
      escapeHtml(destination) +
      '"' +
      (
        website
          ? ' target="_blank" rel="noopener noreferrer"'
          : ''
      ) +
      ' aria-label="' +
      escapeHtml(
        website
          ? "Visit " + name
          : "View " + name
      ) +
      '">' +
      image +
      '<span class="link-home-nonprofit-name">' +
      escapeHtml(name) +
      '</span>' +
      '</a>'
    );
  }


  async function refresh() {

    try {

      var response =
        await fetch(
          "/api/nonprofits/public",
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json"
            },

            cache:
              "no-store"
          }
        );


      if (!response.ok) {
        throw new Error(
          "HTTP "
          + response.status
        );
      }


      var payload =
        await response.json();


      var organizations =
        Array.isArray(
          payload.organizations
        )
          ? payload.organizations
          : [];


      organizations =
        organizations
          .filter(
            function (org) {
              return Boolean(
                organizationName(org)
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


      if (!organizations.length) {
        throw new Error(
          "No approved public nonprofits returned."
        );
      }


      rail.innerHTML =
        organizations
          .map(
            organizationCard
          )
          .join("");


      rail.setAttribute(
        "data-live-nonprofit-count",
        String(
          organizations.length
        )
      );


      console.info(
        "LINK Home nonprofits loaded:",
        organizations.length
      );

    }
    catch (error) {

      /*
       * Never blank the existing Home rail
       * if the API is temporarily unavailable.
       */
      console.warn(
        "LINK Home nonprofit refresh unavailable:",
        error
      );

    }
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      function () {
        window.setTimeout(
          refresh,
          0
        );
      },
      {
        once:
          true
      }
    );

  }
  else {

    window.setTimeout(
      refresh,
      0
    );

  }

})();
