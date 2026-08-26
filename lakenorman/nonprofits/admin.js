(function () {
  "use strict";

  var adminKey = "";
  var submissions = [];
  var currentFilter = "all";

  var unlock =
    document.getElementById(
      "adminUnlock"
    );

  var workspace =
    document.getElementById(
      "adminWorkspace"
    );

  var unlockForm =
    document.getElementById(
      "adminUnlockForm"
    );

  var unlockError =
    document.getElementById(
      "unlockError"
    );

  var list =
    document.getElementById(
      "reviewList"
    );

  var status =
    document.getElementById(
      "reviewStatus"
    );

  var counts =
    document.getElementById(
      "reviewCounts"
    );


  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value)
      .toLocaleString();
  }


  function label(statusValue) {
    var labels = {
      "pending-review":
        "Pending Review",

      "needs-information":
        "Needs Information",

      "approved":
        "Approved",

      "rejected":
        "Rejected",

      "archived":
        "Archived"
    };

    return (
      labels[statusValue] ||
      statusValue
    );
  }


  async function request(
    url,
    options
  ) {
    var response =
      await fetch(
        url,
        {
          ...(options || {}),

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              "Bearer " +
              adminKey,

            ...(
              options &&
              options.headers
                ? options.headers
                : {}
            )
          }
        }
      );

    var data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Request failed."
      );
    }

    return data;
  }


  async function load() {
    status.hidden = false;
    status.textContent =
      "Loading submissions...";

    var data =
      await request(
        "/api/nonprofits/admin/list"
      );

    submissions =
      data.submissions || [];

    unlock.hidden = true;
    workspace.hidden = false;

    render();
  }


  function filtered() {
    if (
      currentFilter === "all"
    ) {
      return submissions;
    }

    return submissions.filter(
      function (row) {
        return (
          row.status ===
          currentFilter
        );
      }
    );
  }


  function renderCounts() {
    function count(value) {
      return submissions.filter(
        function (row) {
          return (
            row.status === value
          );
        }
      ).length;
    }

    counts.innerHTML =
      "<div><strong>" +
        submissions.length +
      "</strong><span>Total</span></div>" +

      "<div><strong>" +
        count("pending-review") +
      "</strong><span>Pending</span></div>" +

      "<div><strong>" +
        count("approved") +
      "</strong><span>Approved</span></div>";
  }


  function card(row) {
    var areas =
      Array.isArray(
        row.service_areas
      )
        ? row.service_areas
        : [];

    var logo =
      row.logo_storage_url
        ? (
            '<img src="' +
            esc(
              row.logo_storage_url
            ) +
            '" alt="">'
          )
        : (
            '<span>NO LOGO</span>'
          );

    return (
      '<article class="review-card" data-card="' +
        esc(row.id) +
      '">' +

        '<div class="review-card-head">' +

          '<div class="review-logo">' +
            logo +
          "</div>" +

          "<div>" +

            '<span class="review-status-pill ' +
              esc(row.status) +
            '">' +
              esc(
                label(
                  row.status
                )
              ) +
            "</span>" +

            "<h2>" +
              esc(
                row.organization_name
              ) +
            "</h2>" +

            "<p>" +
              esc(
                row.reference_code
              ) +
              " · " +
              esc(
                row.submission_type
              ) +
              " · " +
              esc(
                formatDate(
                  row.submitted_at
                )
              ) +
            "</p>" +

          "</div>" +

        "</div>" +


        '<div class="review-grid">' +

          "<div>" +
            "<strong>Contact</strong>" +
            "<p>" +
              esc(row.contact_name) +
              "<br>" +
              esc(row.contact_title) +
              "<br>" +
              esc(row.contact_email) +
              "<br>" +
              esc(row.contact_phone) +
            "</p>" +
          "</div>" +

          "<div>" +
            "<strong>Website</strong>" +
            "<p>" +
              esc(row.website_url) +
            "</p>" +
          "</div>" +

          "<div>" +
            "<strong>Address</strong>" +
            "<p>" +
              esc(row.physical_address) +
              "<br>" +
              esc(
                [
                  row.city,
                  row.state,
                  row.postal_code
                ]
                  .filter(Boolean)
                  .join(", ")
              ) +
            "</p>" +
          "</div>" +

          "<div>" +
            "<strong>Service Areas</strong>" +
            "<p>" +
              esc(
                areas.join(", ")
              ) +
            "</p>" +
          "</div>" +

        "</div>" +


        '<div class="review-section">' +
          "<strong>Mission</strong>" +
          "<p>" +
            esc(row.mission) +
          "</p>" +
        "</div>" +


        '<div class="review-section">' +
          "<strong>Lake Norman Service Evidence</strong>" +
          "<p>" +
            esc(
              row.service_area_explanation
            ) +
          "</p>" +
        "</div>" +


        '<div class="review-section">' +
          "<strong>Current Needs</strong>" +
          "<p>" +
            esc(row.needs_text) +
          "</p>" +
        "</div>" +


        '<div class="review-section">' +
          "<strong>Volunteer Opportunities</strong>" +
          "<p>" +
            esc(
              row.volunteer_opportunities_text
            ) +
          "</p>" +
        "</div>" +


        '<div class="review-section">' +
          "<strong>Events</strong>" +
          "<p>" +
            esc(row.events_text) +
          "</p>" +
        "</div>" +


        '<div class="review-governance">' +

          "<label>" +
            '<input type="checkbox" data-field="locatedInServiceArea">' +
            " Physically located in Lake Norman service area" +
          "</label>" +

          "<label>" +
            '<input type="checkbox" data-field="servesServiceArea" checked>' +
            " Organization currently serves Lake Norman" +
          "</label>" +

          "<label>" +
            '<input type="checkbox" data-field="serviceAreaVerified">' +
            " LINK verified the service-area claim" +
          "</label>" +

          "<label>" +
            "Admin Notes" +
            '<textarea data-field="adminNotes" rows="3">' +
              esc(
                row.admin_notes || ""
              ) +
            "</textarea>" +
          "</label>" +

        "</div>" +


        '<div class="review-actions">' +

          '<button data-action="approve" data-id="' +
            esc(row.id) +
          '">' +
            "APPROVE + PUBLISH" +
          "</button>" +

          '<button data-action="needs-information" data-id="' +
            esc(row.id) +
          '">' +
            "NEEDS INFO" +
          "</button>" +

          '<button data-action="reject" data-id="' +
            esc(row.id) +
          '">' +
            "REJECT" +
          "</button>" +

        "</div>" +

      "</article>"
    );
  }


  function render() {
    renderCounts();

    var rows =
      filtered();

    if (!rows.length) {
      status.hidden = false;

      status.textContent =
        "No submissions in this review status.";

      list.innerHTML = "";
      return;
    }

    status.hidden = true;

    list.innerHTML =
      rows
        .map(card)
        .join("");
  }


  async function review(
    button,
    nextStatus
  ) {
    var id =
      button.dataset.id;

    var card =
      document.querySelector(
        '[data-card="' +
        CSS.escape(id) +
        '"]'
      );

    if (!card) {
      return;
    }

    var located =
      card.querySelector(
        '[data-field="locatedInServiceArea"]'
      );

    var serves =
      card.querySelector(
        '[data-field="servesServiceArea"]'
      );

    var verified =
      card.querySelector(
        '[data-field="serviceAreaVerified"]'
      );

    var notes =
      card.querySelector(
        '[data-field="adminNotes"]'
      );

    if (
      nextStatus === "approved" &&
      (
        !serves.checked ||
        !verified.checked
      )
    ) {
      alert(
        "Before publishing, confirm that the organization serves Lake Norman and that LINK has verified the service-area claim."
      );

      return;
    }

    button.disabled = true;

    try {
      await request(
        "/api/nonprofits/admin/review",
        {
          method: "POST",

          body:
            JSON.stringify({
              submissionId: id,

              status:
                nextStatus,

              locatedInServiceArea:
                located.checked,

              servesServiceArea:
                serves.checked,

              serviceAreaVerified:
                verified.checked,

              adminNotes:
                notes.value
            })
        }
      );

      await load();

    } catch (error) {
      alert(
        error.message ||
        "Review failed."
      );

      button.disabled = false;
    }
  }


  unlockForm.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      adminKey =
        document
          .getElementById(
            "adminKey"
          )
          .value
          .trim();

      unlockError.hidden = true;

      try {
        await load();

      } catch (error) {
        unlockError.hidden = false;

        unlockError.textContent =
          error.message ||
          "Admin access failed.";
      }
    }
  );


  document.addEventListener(
    "click",
    function (event) {
      var filter =
        event.target.closest(
          "[data-filter]"
        );

      if (filter) {
        currentFilter =
          filter.dataset.filter;

        document
          .querySelectorAll(
            "[data-filter]"
          )
          .forEach(
            function (item) {
              item.classList.toggle(
                "active",
                item === filter
              );
            }
          );

        render();
        return;
      }

      var action =
        event.target.closest(
          "[data-action]"
        );

      if (!action) {
        return;
      }

      var nextStatus =
        action.dataset.action ===
          "approve"
          ? "approved"
          : action.dataset.action ===
              "needs-information"
            ? "needs-information"
            : "rejected";

      review(
        action,
        nextStatus
      );
    }
  );
})();
