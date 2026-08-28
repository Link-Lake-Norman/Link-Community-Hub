(function () {
  "use strict";

  var searchInput =
    document.getElementById(
      "opportunitySearch"
    );

  var typeSelect =
    document.getElementById(
      "opportunityType"
    );

  var container =
    document.getElementById(
      "opportunityOrganizations"
    );

  var count =
    document.getElementById(
      "opportunityCount"
    );

  var organizations = [];


  function clean(value) {
    return String(
      value == null ? "" : value
    ).trim();
  }


  function logoUrl(value) {
    var url =
      clean(value);

    if (!url) {
      return "";
    }

    if (url.indexOf("./assets/") === 0) {
      return (
        "/lakenorman/" +
        url.slice(2)
      );
    }

    if (url.indexOf("assets/") === 0) {
      return (
        "/lakenorman/" +
        url
      );
    }

    if (url.indexOf("/assets/") === 0) {
      return (
        "/lakenorman" +
        url
      );
    }

    return url;
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
    var url =
      clean(value);

    return /^https?:\/\//i.test(url)
      ? url
      : "";
  }


  function legacy() {
    return Array.isArray(
      window.LINK_ORGANIZATIONS
    )
      ? window.LINK_ORGANIZATIONS
      : [];
  }


  function itemTitle(item) {
    return clean(
      item.title ||
      item.name ||
      item.need_title ||
      item.opportunity_title ||
      "Community Opportunity"
    );
  }


  function itemDescription(item) {
    return clean(
      item.description ||
      item.summary ||
      item.details ||
      ""
    );
  }


  function itemUrl(item, org) {
    return safeUrl(
      item.actionUrl ||
      item.action_url ||
      item.sourceUrl ||
      item.source_url ||
      item.url ||
      item.source ||
      org.website
    );
  }


  function itemType(item) {
    var raw =
      (
        clean(item.type) +
        " " +
        itemTitle(item) +
        " " +
        itemDescription(item)
      ).toLowerCase();


    if (
      raw.includes("donat") ||
      raw.includes("in-kind") ||
      raw.includes("financial") ||
      raw.includes("food") ||
      raw.includes("clothing") ||
      raw.includes("supplies") ||
      raw.includes("give")
    ) {
      return "donation";
    }


    if (
      raw.includes("mentor") ||
      raw.includes("tutor") ||
      raw.includes("student") ||
      raw.includes("education")
    ) {
      return "mentor";
    }


    if (
      raw.includes("event") ||
      raw.includes("fundrais") ||
      raw.includes("festival")
    ) {
      return "event";
    }


    if (
      raw.includes("business") ||
      raw.includes("corporate") ||
      raw.includes("partner") ||
      raw.includes("sponsor") ||
      raw.includes("professional") ||
      raw.includes("consult")
    ) {
      return "business";
    }


    if (
      raw.includes("volunteer") ||
      raw.includes("serve") ||
      raw.includes("service")
    ) {
      return "volunteer";
    }


    return "other";
  }


  function uniqueItems(items) {
    var seen =
      new Set();

    return items.filter(
      function (item) {
        var id =
          key(
            item.id ||
            itemTitle(item)
          );

        if (!id || seen.has(id)) {
          return false;
        }

        seen.add(id);

        return true;
      }
    );
  }


  function buildLegacyMap() {
    var map =
      new Map();

    legacy().forEach(
      function (org) {

        var name =
          clean(org.name);

        if (!name) return;

        map.set(
          key(name),
          {
            name:name,

            website:
              clean(org.website),

            logo:
              logoUrl(org.logo),

            category:
              clean(org.category),

            needs:
              Array.isArray(org.needs)
                ? org.needs.slice()
                : [],

            opportunities:
              Array.isArray(org.opportunities)
                ? org.opportunities.slice()
                : []
          }
        );
      }
    );

    return map;
  }


  function merge(apiOrganizations) {
    var map =
      buildLegacyMap();

    (apiOrganizations || [])
      .forEach(
        function (row) {

          var name =
            clean(
              row.display_name ||
              row.name
            );

          if (!name) return;

          var id =
            key(name);

          var old =
            map.get(id) || {
              needs:[],
              opportunities:[]
            };


          var apiNeeds =
            Array.isArray(row.needs)
              ? row.needs
              : [];


          var apiOpportunities =
            Array.isArray(row.opportunities)
              ? row.opportunities
              : [];


          map.set(
            id,
            {
              name:name,

              website:
                clean(row.website_url) ||
                clean(row.website) ||
                clean(old.website),

              logo:
                logoUrl(row.logo_url) ||
                logoUrl(row.logo) ||
                logoUrl(old.logo),

              category:
                clean(row.category) ||
                clean(old.category),

              needs:
                uniqueItems(
                  apiNeeds.concat(
                    old.needs || []
                  )
                ),

              opportunities:
                uniqueItems(
                  apiOpportunities.concat(
                    old.opportunities || []
                  )
                )
            }
          );
        }
      );


    return Array.from(
      map.values()
    ).sort(
      function (a,b) {
        return a.name.localeCompare(
          b.name
        );
      }
    );
  }


  function filteredItems(org) {
    var selected =
      typeSelect.value;

    var all =
      [];

    (org.needs || []).forEach(
      function (item) {
        all.push({
          group:"Current Needs",
          item:item
        });
      }
    );

    (org.opportunities || [])
      .forEach(
        function (item) {
          all.push({
            group:"Opportunities",
            item:item
          });
        }
      );


    if (selected === "all") {
      return all;
    }


    return all.filter(
      function (entry) {
        return (
          itemType(entry.item) ===
          selected
        );
      }
    );
  }


  function renderItem(entry,org) {
    var item =
      entry.item;

    var type =
      itemType(item);

    var url =
      itemUrl(item,org);

    var description =
      itemDescription(item);


    return (
      '<article class="opportunity-item">' +

        '<span class="item-type ' +
        esc(type) +
        '">' +
        esc(type.toUpperCase()) +
        '</span>' +

        '<h3>' +
        esc(itemTitle(item)) +
        '</h3>' +

        (
          description
            ? (
                '<p>' +
                esc(description) +
                '</p>'
              )
            : ""
        ) +

        (
          url
            ? (
                '<a href="' +
                esc(url) +
                '" target="_blank" rel="noopener noreferrer">' +
                'VIEW / TAKE ACTION →' +
                '</a>'
              )
            : (
                '<a href="/lakenorman/nonprofits/">' +
                'VIEW NONPROFIT →' +
                '</a>'
              )
        ) +

      '</article>'
    );
  }


  function render() {
    var query =
      clean(
        searchInput.value
      ).toLowerCase();


    var shownOrganizations =
      0;

    var shownListings =
      0;


    var html =
      organizations
        .map(
          function (org) {

            var entries =
              filteredItems(org);


            var searchable =
              (
                org.name +
                " " +
                org.category +
                " " +
                entries
                  .map(
                    function (entry) {
                      return (
                        itemTitle(entry.item) +
                        " " +
                        itemDescription(entry.item)
                      );
                    }
                  )
                  .join(" ")
              ).toLowerCase();


            if (
              query &&
              !searchable.includes(query)
            ) {
              return "";
            }


            if (
              typeSelect.value !== "all" &&
              !entries.length
            ) {
              return "";
            }


            shownOrganizations += 1;
            shownListings +=
              entries.length;


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
                    '<span class="member-org-placeholder">' +
                    esc(
                      org.name.charAt(0)
                    ) +
                    '</span>'
                  );


            var body =
              entries.length
                ? entries
                    .map(
                      function (entry) {
                        return renderItem(
                          entry,
                          org
                        );
                      }
                    )
                    .join("")
                : (
                    '<div class="member-no-listings">' +
                    'No current public listings are posted for this organization.' +
                    '</div>'
                  );


            return (
              '<details class="member-org">' +

                '<summary>' +

                  '<div class="member-org-logo">' +
                    logo +
                  '</div>' +

                  '<div class="member-org-name">' +

                    '<strong>' +
                    esc(org.name) +
                    '</strong>' +

                    (
                      org.category
                        ? (
                            '<span>' +
                            esc(org.category) +
                            '</span>'
                          )
                        : ""
                    ) +

                  '</div>' +

                  '<div class="member-org-total">' +
                    entries.length +
                    (
                      entries.length === 1
                        ? ' LISTING'
                        : ' LISTINGS'
                    ) +
                  '</div>' +

                  '<div class="member-org-plus">＋</div>' +

                '</summary>' +

                '<div class="member-org-body">' +
                  body +
                '</div>' +

              '</details>'
            );
          }
        )
        .join("");


    container.innerHTML =
      html ||
      '<div class="member-no-listings">No matching opportunities found.</div>';


    count.textContent =
      shownOrganizations +
      " NONPROFITS · " +
      shownListings +
      " LISTINGS";
  }


  async function init() {
    var apiOrganizations =
      [];

    try {
      var response =
        await fetch(
          "/api/nonprofits/public",
          {
            cache:"no-store",

            headers:{
              Accept:"application/json"
            }
          }
        );


      if (response.ok) {
        var payload =
          await response.json();

        apiOrganizations =
          Array.isArray(
            payload.organizations
          )
            ? payload.organizations
            : [];
      }
    }
    catch (error) {
      console.warn(
        "Using registry fallback.",
        error
      );
    }


    organizations =
      merge(
        apiOrganizations
      );


    var params =
      new URLSearchParams(
        window.location.search
      );

    var requested =
      params.get("type");


    if (
      requested &&
      Array.from(
        typeSelect.options
      ).some(
        function (option) {
          return (
            option.value ===
            requested
          );
        }
      )
    ) {
      typeSelect.value =
        requested;
    }


    searchInput.addEventListener(
      "input",
      render
    );

    typeSelect.addEventListener(
      "change",
      render
    );


    render();
  }


  init();

})();
