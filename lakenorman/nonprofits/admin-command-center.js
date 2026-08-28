(function () {
  "use strict";

  var state = {
    adminKey: "",
    command: null,
    submissions: [],
    events: [],
    submissionFilter: "all",
    eventFilter: "all",
    mediaFilter: "all",
    organizationSearch: "",
    currentBrief: null
  };


  function el(id) {
    return document.getElementById(id);
  }


  function esc(value) {
    return String(
      value == null ? "" : value
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function fmtDate(value) {
    if (!value) {
      return "—";
    }

    var date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleString();
  }


  function fmtShortDate(value) {
    if (!value) {
      return "—";
    }

    var date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
  }


  function label(value) {
    var labels = {
      "pending-review":
        "Pending Review",

      pending:
        "Pending Review",

      draft:
        "Draft",

      "needs-information":
        "Needs Information",

      approved:
        "Approved",

      rejected:
        "Rejected",

      archived:
        "Archived",

      scheduled:
        "Scheduled"
    };

    return (
      labels[value] ||
      value ||
      "Unknown"
    );
  }


  function cssStatus(value) {
    return String(
      value || "unknown"
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      );
  }


  function notice(
    message,
    type
  ) {
    var box = el(
      "adminNotice"
    );

    if (!message) {
      box.hidden = true;
      box.textContent = "";
      box.className =
        "admin-message";

      return;
    }

    box.hidden = false;
    box.textContent =
      message;

    box.className =
      "admin-message " +
      (type || "success");
  }


  async function request(
    url,
    options
  ) {
    options =
      options || {};

    var headers =
      Object.assign(
        {},
        options.headers || {},
        {
          Authorization:
            "Bearer " +
            state.adminKey
        }
      );

    if (
      options.body &&
      !headers[
        "Content-Type"
      ]
    ) {
      headers[
        "Content-Type"
      ] =
        "application/json";
    }

    var response =
      await fetch(
        url,
        Object.assign(
          {},
          options,
          {
            headers: headers
          }
        )
      );

    var data = {};

    try {
      data =
        await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Request failed."
      );
    }

    return data;
  }


  async function loadAll() {
    var results =
      await Promise.all([
        request(
          "/api/nonprofits/admin/command-center"
        ),

        request(
          "/api/nonprofits/admin/list"
        ),

        request(
          "/api/nonprofits/admin/events"
        )
      ]);

    state.command =
      results[0] || {};

    state.submissions =
      results[1].submissions ||
      [];

    state.events =
      results[2].events ||
      [];

    renderAll();

    el("lastRefresh")
      .textContent =
        "Last refreshed " +
        new Date()
          .toLocaleTimeString();
  }


  function switchPanel(name) {
    document
      .querySelectorAll(
        "[data-admin-panel]"
      )
      .forEach(
        function (panel) {
          var active =
            panel.getAttribute(
              "data-admin-panel"
            ) === name;

          panel.hidden =
            !active;

          panel.classList.toggle(
            "active",
            active
          );
        }
      );

    document
      .querySelectorAll(
        "[data-panel]"
      )
      .forEach(
        function (button) {
          button.classList.toggle(
            "active",
            button.dataset.panel ===
              name
          );
        }
      );

    notice("");
  }


  function stat(
    value,
    title,
    note,
    attention
  ) {
    return (
      '<article class="stat-card' +
      (
        attention
          ? " attention"
          : ""
      ) +
      '">' +

        "<strong>" +
          esc(value || 0) +
        "</strong>" +

        "<span>" +
          esc(title) +
        "</span>" +

        "<small>" +
          esc(note || "") +
        "</small>" +

      "</article>"
    );
  }


  function pendingEvents() {
    return state.events.filter(
      function (row) {
        return (
          row.status !==
            "approved" &&
          row.status !==
            "rejected" &&
          row.status !==
            "archived"
        );
      }
    ).length;
  }


  function renderDashboard() {
    var stats =
      (
        state.command &&
        state.command.stats
      ) ||
      {};

    var submissions =
      stats.submissions || {};

    var organizations =
      stats.organizations || {};

    var media =
      stats.media || {};

    var resources =
      stats.resources || {};

    var eventPending =
      pendingEvents();

    el("dashboardStats")
      .innerHTML =

        stat(
          submissions.pending || 0,
          "Submissions Pending",
          "Governance review",
          Number(
            submissions.pending || 0
          ) > 0
        ) +

        stat(
          organizations.public || 0,
          "Managed Organizations",
          "Approved + public",
          false
        ) +

        stat(
          eventPending,
          "Events Pending",
          "Calendar review",
          eventPending > 0
        ) +

        stat(
          media.pending || 0,
          "Photos Pending",
          "Publication review",
          Number(
            media.pending || 0
          ) > 0
        ) +

        stat(
          resources.total || 0,
          "Resource Listings",
          "Resource Exchange",
          false
        );


    el("submissionTabCount")
      .textContent =
        submissions.pending || 0;

    el("eventTabCount")
      .textContent =
        eventPending;

    el("mediaTabCount")
      .textContent =
        media.pending || 0;
  }


  function submissionCount(
    status
  ) {
    return state.submissions
      .filter(
        function (row) {
          return (
            row.status ===
            status
          );
        }
      )
      .length;
  }


  function submissionCard(row) {
    var serviceAreas =
      Array.isArray(
        row.service_areas
      )
        ? row.service_areas
        : [];

    var logo = row.logo_storage_url
      ? (
        '<img src="' +
        esc(row.logo_storage_url) +
        '" alt="">'
      )
      : (
        '<span class="image-placeholder">' +
        "NO LOGO" +
        "</span>"
      );

    var reviewControls = "";

    if (
      row.status ===
        "pending-review" ||
      row.status ===
        "needs-information"
    ) {
      reviewControls =
        '<div class="governance-box">' +

          "<label>" +
            '<input type="checkbox" ' +
            'data-governance="located">' +
            " Physically located in the Lake Norman service area" +
          "</label>" +

          "<label>" +
            '<input type="checkbox" ' +
            'data-governance="serves" checked>' +
            " Currently serves the Lake Norman community" +
          "</label>" +

          "<label>" +
            '<input type="checkbox" ' +
            'data-governance="verified">' +
            " LINK verified the service-area claim" +
          "</label>" +

          "<label>" +
            "<span>Admin Notes</span>" +
            '<textarea rows="3" ' +
            'data-governance="notes">' +
              esc(
                row.admin_notes || ""
              ) +
            "</textarea>" +
          "</label>" +

        "</div>" +

        '<div class="record-actions">' +

          '<button type="button" ' +
          'class="primary" ' +
          'data-review-action="approved" ' +
          'data-review-id="' +
          esc(row.id) +
          '">' +
            "APPROVE + PUBLISH" +
          "</button>" +

          '<button type="button" ' +
          'data-review-action="needs-information" ' +
          'data-review-id="' +
          esc(row.id) +
          '">' +
            "NEEDS INFO" +
          "</button>" +

          '<button type="button" ' +
          'class="danger" ' +
          'data-review-action="rejected" ' +
          'data-review-id="' +
          esc(row.id) +
          '">' +
            "REJECT" +
          "</button>" +

        "</div>";
    }


    return (
      '<article class="admin-record" ' +
      'data-submission-card="' +
      esc(row.id) +
      '">' +

        '<div class="record-head">' +

          '<div class="record-logo">' +
            logo +
          "</div>" +

          '<div class="record-title">' +

            '<span class="status-pill ' +
            cssStatus(
              row.status
            ) +
            '">' +
              esc(
                label(
                  row.status
                )
              ) +
            "</span>" +

            "<h3>" +
              esc(
                row.organization_name
              ) +
            "</h3>" +

            "<p>" +
              esc(
                row.reference_code
              ) +
              " · " +
              esc(
                fmtDate(
                  row.submitted_at
                )
              ) +
            "</p>" +

          "</div>" +

        "</div>" +


        '<div class="record-grid">' +

          "<div>" +
            "<strong>Contact</strong>" +
            "<p>" +
              esc(
                row.contact_name
              ) +
              "<br>" +
              esc(
                row.contact_title
              ) +
              "<br>" +
              esc(
                row.contact_email
              ) +
              "<br>" +
              esc(
                row.contact_phone
              ) +
            "</p>" +
          "</div>" +

          "<div>" +
            "<strong>Website</strong>" +
            "<p>" +
              esc(
                row.website_url
              ) +
            "</p>" +
          "</div>" +

          "<div>" +
            "<strong>Location</strong>" +
            "<p>" +
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
                serviceAreas.join(
                  ", "
                )
              ) +
            "</p>" +
          "</div>" +

        "</div>" +


        '<div class="record-section">' +
          "<strong>Mission</strong>" +
          "<p>" +
            esc(
              row.mission
            ) +
          "</p>" +
        "</div>" +


        '<div class="record-section">' +
          "<strong>Lake Norman Service Evidence</strong>" +
          "<p>" +
            esc(
              row.service_area_explanation
            ) +
          "</p>" +
        "</div>" +


        '<div class="record-section">' +
          "<strong>Current Needs</strong>" +
          "<p>" +
            esc(
              row.needs_text
            ) +
          "</p>" +
        "</div>" +


        '<div class="record-section">' +
          "<strong>Volunteer Opportunities</strong>" +
          "<p>" +
            esc(
              row.volunteer_opportunities_text
            ) +
          "</p>" +
        "</div>" +

        reviewControls +

      "</article>"
    );
  }


  function renderSubmissions() {
    el("submissionCounts")
      .innerHTML =
        "<div><strong>" +
          state.submissions.length +
        "</strong><span>Total</span></div>" +

        "<div><strong>" +
          submissionCount(
            "pending-review"
          ) +
        "</strong><span>Pending</span></div>" +

        "<div><strong>" +
          submissionCount(
            "needs-information"
          ) +
        "</strong><span>Needs Info</span></div>" +

        "<div><strong>" +
          submissionCount(
            "approved"
          ) +
        "</strong><span>Approved</span></div>";


    var rows =
      state.submissions;

    if (
      state.submissionFilter !==
      "all"
    ) {
      rows =
        rows.filter(
          function (row) {
            return (
              row.status ===
              state.submissionFilter
            );
          }
        );
    }


    if (!rows.length) {
      el("submissionList")
        .innerHTML =
          '<div class="empty-state">' +
            "<strong>No submissions here.</strong>" +
            "<p>No records match this review status.</p>" +
          "</div>";

      return;
    }


    el("submissionList")
      .innerHTML =
        rows
          .map(
            submissionCard
          )
          .join("");
  }


  function organizationCard(row) {
    var logo =
      row.logo_url
        ? (
          '<img src="' +
          esc(row.logo_url) +
          '" alt="">'
        )
        : (
          '<span class="image-placeholder">' +
          "LINK" +
          "</span>"
        );


    return (
      '<article class="admin-record">' +

        '<div class="record-head">' +

          '<div class="record-logo">' +
            logo +
          "</div>" +

          '<div class="record-title">' +

            '<span class="status-pill ' +
            (
              row.active
                ? "approved"
                : "archived"
            ) +
            '">' +
              (
                row.active
                  ? "Active"
                  : "Inactive"
              ) +
            "</span>" +

            "<h3>" +
              esc(
                row.display_name
              ) +
            "</h3>" +

            "<p>" +
              esc(
                [
                  row.city,
                  row.state
                ]
                  .filter(Boolean)
                  .join(", ")
              ) +
            "</p>" +

          "</div>" +

        "</div>" +


        '<div class="organization-meta">' +

          "<span>" +
            "<strong>Approval</strong>" +
            esc(
              label(
                row.approval_status
              )
            ) +
          "</span>" +

          "<span>" +
            "<strong>Public Status</strong>" +
            esc(
              row.public_status ||
              "—"
            ) +
          "</span>" +

          "<span>" +
            "<strong>Service Area</strong>" +
            (
              row.service_area_verified
                ? "Verified"
                : "Not Verified"
            ) +
          "</span>" +

        "</div>" +


        (
          row.mission
            ? (
              '<div class="record-section">' +
                "<strong>Mission</strong>" +
                "<p>" +
                  esc(
                    row.mission
                  ) +
                "</p>" +
              "</div>"
            )
            : ""
        ) +


        '<div class="record-actions">' +

          (
            row.website_url
              ? (
                '<a href="' +
                esc(
                  row.website_url
                ) +
                '" target="_blank" ' +
                'rel="noopener">' +
                  "WEBSITE" +
                "</a>"
              )
              : ""
          ) +

          '<button type="button" ' +
          (
            row.active
              ? 'class="danger" '
              : 'class="primary" '
          ) +
          'data-organization-action="' +
          (
            row.active
              ? "deactivate"
              : "activate"
          ) +
          '" data-organization-id="' +
          esc(row.id) +
          '">' +
          (
            row.active
              ? "DEACTIVATE"
              : "ACTIVATE"
          ) +
          "</button>" +

        "</div>" +

      "</article>"
    );
  }


  function renderOrganizations() {
    var rows =
      (
        state.command &&
        state.command.organizations
      ) ||
      [];

    var search =
      state.organizationSearch
        .trim()
        .toLowerCase();

    if (search) {
      rows =
        rows.filter(
          function (row) {
            return (
              String(
                row.display_name ||
                ""
              )
                .toLowerCase()
                .includes(search) ||

              String(
                row.city ||
                ""
              )
                .toLowerCase()
                .includes(search)
            );
          }
        );
    }


    if (!rows.length) {
      el("organizationList")
        .innerHTML =
          '<div class="empty-state">' +
            "<strong>No organizations found.</strong>" +
          "</div>";

      return;
    }


    el("organizationList")
      .innerHTML =
        rows
          .map(
            organizationCard
          )
          .join("");
  }


  function eventCard(row) {
    var pending =
      row.status !==
        "approved" &&
      row.status !==
        "rejected" &&
      row.status !==
        "archived";

    var buttons = "";


    if (pending) {
      buttons =
        '<button type="button" ' +
        'class="primary" ' +
        'data-event-action="approve" ' +
        'data-event-id="' +
        esc(row.id) +
        '">' +
          "APPROVE + PUBLISH" +
        "</button>" +

        '<button type="button" ' +
        'class="danger" ' +
        'data-event-action="reject" ' +
        'data-event-id="' +
        esc(row.id) +
        '">' +
          "REJECT" +
        "</button>";
    }


    if (
      row.status ===
      "approved"
    ) {
      buttons =
        '<button type="button" ' +
        'data-event-action="feature" ' +
        'data-event-featured="' +
        (
          row.featured
            ? "false"
            : "true"
        ) +
        '" data-event-id="' +
        esc(row.id) +
        '">' +
        (
          row.featured
            ? "REMOVE FEATURED"
            : "FEATURE EVENT"
        ) +
        "</button>" +

        '<button type="button" ' +
        'class="danger" ' +
        'data-event-action="archive" ' +
        'data-event-id="' +
        esc(row.id) +
        '">' +
          "ARCHIVE" +
        "</button>";
    }


    if (
      row.status ===
      "rejected"
    ) {
      buttons =
        '<button type="button" ' +
        'class="primary" ' +
        'data-event-action="approve" ' +
        'data-event-id="' +
        esc(row.id) +
        '">' +
          "APPROVE" +
        "</button>" +

        '<button type="button" ' +
        'data-event-action="archive" ' +
        'data-event-id="' +
        esc(row.id) +
        '">' +
          "ARCHIVE" +
        "</button>";
    }


    return (
      '<article class="admin-record">' +

        (
          row.flyer_url
            ? (
              '<div class="event-flyer">' +
                '<img src="' +
                esc(
                  row.flyer_url
                ) +
                '" alt="Event flyer">' +
              "</div>"
            )
            : ""
        ) +

        '<div class="event-content">' +

          '<span class="status-pill ' +
          cssStatus(
            row.status
          ) +
          '">' +
            esc(
              label(
                row.status
              )
            ) +
          "</span>" +

          (
            row.featured
              ? (
                '<span class="featured-pill">' +
                  "Featured" +
                "</span>"
              )
              : ""
          ) +

          "<h3>" +
            esc(
              row.title
            ) +
          "</h3>" +

          "<p><strong>" +
            esc(
              row.organization_name ||
              row.display_name ||
              "Organization"
            ) +
          "</strong></p>" +


          '<div class="event-meta">' +

            "<span>" +
              "<strong>Date</strong>" +
              esc(
                fmtShortDate(
                  row.starts_at
                )
              ) +
            "</span>" +

            "<span>" +
              "<strong>Location</strong>" +
              esc(
                row.location_name ||
                [
                  row.city,
                  row.state
                ]
                  .filter(Boolean)
                  .join(", ") ||
                "—"
              ) +
            "</span>" +

            "<span>" +
              "<strong>Flyer</strong>" +
              (
                row.flyer_url
                  ? (
                    row.flyer_approved
                      ? "Approved"
                      : "Pending"
                  )
                  : "None"
              ) +
            "</span>" +

          "</div>" +


          (
            row.description
              ? (
                "<p>" +
                  esc(
                    row.description
                  ) +
                "</p>"
              )
              : ""
          ) +


          '<div class="record-actions">' +

            (
              row.event_url
                ? (
                  '<a href="' +
                  esc(
                    row.event_url
                  ) +
                  '" target="_blank" ' +
                  'rel="noopener">' +
                    "EVENT LINK" +
                  "</a>"
                )
                : ""
            ) +

            buttons +

          "</div>" +

        "</div>" +

      "</article>"
    );
  }


  function renderEvents() {
    var rows =
      state.events.slice();


    if (
      state.eventFilter ===
      "pending"
    ) {
      rows =
        rows.filter(
          function (row) {
            return (
              row.status !==
                "approved" &&
              row.status !==
                "rejected" &&
              row.status !==
                "archived"
            );
          }
        );

    } else if (
      state.eventFilter !==
      "all"
    ) {
      rows =
        rows.filter(
          function (row) {
            return (
              row.status ===
              state.eventFilter
            );
          }
        );
    }


    if (!rows.length) {
      el("eventList")
        .innerHTML =
          '<div class="empty-state">' +
            "<strong>No events in this status.</strong>" +
            "<p>Submitted nonprofit events will appear here.</p>" +
          "</div>";

      return;
    }


    el("eventList")
      .innerHTML =
        rows
          .map(eventCard)
          .join("");
  }


  function mediaCard(row) {
    return (
      '<article class="media-card">' +

        '<div class="media-image">' +

          '<img src="' +
          esc(
            row.storage_url
          ) +
          '" alt="' +
          esc(
            row.alt_text ||
            row.caption ||
            "Submitted nonprofit photo"
          ) +
          '">' +

          '<span class="status-pill ' +
          (
            row.approved
              ? "approved"
              : "pending-review"
          ) +
          '">' +
          (
            row.approved
              ? "Approved"
              : "Pending"
          ) +
          "</span>" +

        "</div>" +


        '<div class="media-content">' +

          "<strong>" +
            esc(
              row.organization_name
            ) +
          "</strong>" +

          "<h3>" +
            esc(
              row.story_title ||
              row.caption ||
              row.file_name ||
              "Community Photo"
            ) +
          "</h3>" +


          '<div class="permissions">' +

            "<span>" +
            (
              row.authorization_confirmed
                ? "✓"
                : "✕"
            ) +
            " Sharing authorization</span>" +

            "<span>" +
            (
              row.public_site_allowed
                ? "✓"
                : "—"
            ) +
            " Public site</span>" +

            "<span>" +
            (
              row.newsletter_allowed
                ? "✓"
                : "—"
            ) +
            " Community Brief</span>" +

            (
              row.minors_present
                ? (
                  "<span>" +
                  (
                    row.minors_consent_confirmed
                      ? "✓"
                      : "✕"
                  ) +
                  " Minors consent</span>"
                )
                : (
                  "<span>✓ No minors indicated</span>"
                )
            ) +

          "</div>" +


          '<div class="record-actions">' +

            (
              row.approved
                ? (
                  '<button type="button" ' +
                  'class="danger" ' +
                  'data-media-action="unapprove" ' +
                  'data-media-id="' +
                  esc(row.id) +
                  '">' +
                    "REMOVE APPROVAL" +
                  "</button>"
                )
                : (
                  '<button type="button" ' +
                  'class="primary" ' +
                  'data-media-action="approve" ' +
                  'data-media-id="' +
                  esc(row.id) +
                  '">' +
                    "APPROVE PHOTO" +
                  "</button>"
                )
            ) +

          "</div>" +

        "</div>" +

      "</article>"
    );
  }


  function renderMedia() {
    var rows =
      (
        state.command &&
        state.command.media
      ) ||
      [];


    if (
      state.mediaFilter ===
      "pending"
    ) {
      rows =
        rows.filter(
          function (row) {
            return !row.approved;
          }
        );

    } else if (
      state.mediaFilter ===
      "approved"
    ) {
      rows =
        rows.filter(
          function (row) {
            return !!row.approved;
          }
        );
    }


    if (!rows.length) {
      el("mediaList")
        .innerHTML =
          '<div class="empty-state">' +
            "<strong>No photos in this status.</strong>" +
            "<p>Organization-submitted photos will appear here.</p>" +
          "</div>";

      return;
    }


    el("mediaList")
      .innerHTML =
        rows
          .map(mediaCard)
          .join("");
  }


  function renderAll() {
    renderDashboard();
    renderSubmissions();
    renderOrganizations();
    renderEvents();
    renderMedia();
  }


  async function reviewSubmission(
    button
  ) {
    var id =
      button.dataset.reviewId;

    var nextStatus =
      button.dataset.reviewAction;

    var card =
      document.querySelector(
        '[data-submission-card="' +
        id +
        '"]'
      );

    if (!card) {
      return;
    }


    var located =
      card.querySelector(
        '[data-governance="located"]'
      );

    var serves =
      card.querySelector(
        '[data-governance="serves"]'
      );

    var verified =
      card.querySelector(
        '[data-governance="verified"]'
      );

    var notes =
      card.querySelector(
        '[data-governance="notes"]'
      );


    if (
      nextStatus ===
      "approved"
    ) {
      if (
        !serves ||
        !serves.checked ||
        !verified ||
        !verified.checked
      ) {
        notice(
          "Before publishing, confirm Lake Norman service and LINK service-area verification.",
          "error"
        );

        return;
      }
    }


    button.disabled = true;

    try {

      await request(
        "/api/nonprofits/admin/review",
        {
          method: "POST",

          body:
            JSON.stringify({
              submissionId:
                id,

              status:
                nextStatus,

              locatedInServiceArea:
                located
                  ? located.checked
                  : false,

              servesServiceArea:
                serves
                  ? serves.checked
                  : true,

              serviceAreaVerified:
                verified
                  ? verified.checked
                  : true,

              adminNotes:
                notes
                  ? notes.value
                  : ""
            })
        }
      );

      await loadAll();

      notice(
        "Submission updated successfully.",
        "success"
      );

    } catch (error) {

      button.disabled = false;

      notice(
        error.message,
        "error"
      );
    }
  }


  async function updateOrganization(
    button
  ) {
    button.disabled = true;

    try {

      await request(
        "/api/nonprofits/admin/command-center",
        {
          method: "PATCH",

          body:
            JSON.stringify({
              section:
                "organization",

              organizationId:
                button.dataset
                  .organizationId,

              action:
                button.dataset
                  .organizationAction
            })
        }
      );

      await loadAll();

      notice(
        "Organization status updated.",
        "success"
      );

    } catch (error) {

      button.disabled = false;

      notice(
        error.message,
        "error"
      );
    }
  }


  async function updateEvent(
    button
  ) {
    button.disabled = true;

    var payload = {
      eventId:
        button.dataset.eventId,

      action:
        button.dataset.eventAction
    };


    if (
      payload.action ===
      "feature"
    ) {
      payload.featured =
        button.dataset
          .eventFeatured ===
        "true";
    }


    try {

      await request(
        "/api/nonprofits/admin/events",
        {
          method: "PATCH",

          body:
            JSON.stringify(
              payload
            )
        }
      );

      await loadAll();

      notice(
        "Event updated successfully.",
        "success"
      );

    } catch (error) {

      button.disabled = false;

      notice(
        error.message,
        "error"
      );
    }
  }


  async function updateMedia(
    button
  ) {
    button.disabled = true;

    try {

      await request(
        "/api/nonprofits/admin/command-center",
        {
          method: "PATCH",

          body:
            JSON.stringify({
              section:
                "media",

              assetId:
                button.dataset
                  .mediaId,

              action:
                button.dataset
                  .mediaAction
            })
        }
      );

      await loadAll();

      notice(
        "Photo review updated.",
        "success"
      );

    } catch (error) {

      button.disabled = false;

      notice(
        error.message,
        "error"
      );
    }
  }


  function setBrief(
    edition
  ) {
    state.currentBrief =
      edition || null;

    var available =
      Boolean(
        state.currentBrief &&
        state.currentBrief.id
      );


    el("previewBrief")
      .disabled =
        !available;

    el("approveBrief")
      .disabled =
        !available;

    el("scheduleBrief")
      .disabled =
        !(
          available &&
          state.currentBrief
            .status ===
            "approved"
        );


    if (!available) {
      el("briefStatus")
        .textContent =
          "No edition selected.";

      return;
    }


    el("briefStatus")
      .textContent =
        (
          state.currentBrief
            .edition_month ||
          "Community Brief"
        ) +
        " · " +
        label(
          state.currentBrief
            .status
        );


    if (
      state.currentBrief.subject
    ) {
      el("briefSubject")
        .value =
          state.currentBrief
            .subject;
    }


    if (
      state.currentBrief.preview_text
    ) {
      el("briefPreviewText")
        .value =
          state.currentBrief
            .preview_text;
    }


    if (
      state.currentBrief.intro_note
    ) {
      el("briefIntroNote")
        .value =
          state.currentBrief
            .intro_note;
    }
  }


  async function generateBrief() {
    var button =
      el("generateBrief");

    button.disabled = true;

    try {

      var data =
        await request(
          "/api/community-brief/admin/generate",
          {
            method: "POST",

            body:
              JSON.stringify({
                month:
                  el("briefMonth")
                    .value
              })
          }
        );


      var edition =
        data.edition ||
        data.draft ||
        null;


      if (
        !edition ||
        !edition.id
      ) {
        throw new Error(
          "Community Brief draft did not return an edition record."
        );
      }


      setBrief(
        edition
      );

      notice(
        "Community Brief draft generated.",
        "success"
      );

    } catch (error) {

      notice(
        error.message,
        "error"
      );

    } finally {

      button.disabled = false;
    }
  }


  async function previewBrief() {
    if (
      !state.currentBrief ||
      !state.currentBrief.id
    ) {
      return;
    }


    try {

      var data =
        await request(
          "/api/community-brief/admin/render?id=" +
          encodeURIComponent(
            state.currentBrief.id
          )
        );


      var frame =
        el(
          "briefPreviewFrame"
        );

      frame.hidden =
        false;

      frame.srcdoc =
        data.html || "";

      notice(
        "Community Brief preview loaded.",
        "success"
      );

    } catch (error) {

      notice(
        error.message,
        "error"
      );
    }
  }


  async function approveBrief() {
    if (
      !state.currentBrief ||
      !state.currentBrief.id
    ) {
      return;
    }


    var button =
      el("approveBrief");

    button.disabled = true;


    try {

      var data =
        await request(
          "/api/community-brief/admin/approve",
          {
            method: "POST",

            body:
              JSON.stringify({
                id:
                  state.currentBrief.id,

                subject:
                  el("briefSubject")
                    .value,

                previewText:
                  el("briefPreviewText")
                    .value,

                introNote:
                  el("briefIntroNote")
                    .value
              })
          }
        );


      setBrief(
        data.edition
      );

      notice(
        "Community Brief approved.",
        "success"
      );

    } catch (error) {

      button.disabled = false;

      notice(
        error.message,
        "error"
      );
    }
  }


  async function scheduleBrief() {
    if (
      !state.currentBrief ||
      !state.currentBrief.id
    ) {
      return;
    }


    var value =
      el("briefSchedule")
        .value;


    if (!value) {
      notice(
        "Choose a send date and time.",
        "error"
      );

      return;
    }


    var scheduled =
      new Date(value);


    if (
      Number.isNaN(
        scheduled.getTime()
      )
    ) {
      notice(
        "Choose a valid send date and time.",
        "error"
      );

      return;
    }


    var button =
      el("scheduleBrief");

    button.disabled = true;


    try {

      await request(
        "/api/community-brief/admin/schedule",
        {
          method: "POST",

          body:
            JSON.stringify({
              id:
                state.currentBrief.id,

              scheduledAt:
                scheduled
                  .toISOString()
            })
        }
      );


      state.currentBrief
        .status =
          "scheduled";

      setBrief(
        state.currentBrief
      );

      notice(
        "Community Brief scheduled.",
        "success"
      );

    } catch (error) {

      button.disabled = false;

      notice(
        error.message,
        "error"
      );
    }
  }


  function defaultMonth() {
    var now =
      new Date();

    el("briefMonth")
      .value =
        now.getFullYear() +
        "-" +
        String(
          now.getMonth() + 1
        )
          .padStart(
            2,
            "0"
          );
  }


  el("adminUnlockForm")
    .addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        var key =
          el("adminKey")
            .value
            .trim();

        if (!key) {
          return;
        }

        state.adminKey =
          key;

        el("unlockError")
          .hidden =
            true;


        try {

          await loadAll();

          el("adminKey")
            .value =
              "";

          el("adminUnlock")
            .hidden =
              true;

          el("adminWorkspace")
            .hidden =
              false;

        } catch (error) {

          state.adminKey =
            "";

          el("unlockError")
            .hidden =
              false;

          el("unlockError")
            .textContent =
              error.message;
        }
      }
    );


  el("refreshAdmin")
    .addEventListener(
      "click",
      async function () {
        try {

          await loadAll();

          notice(
            "Admin data refreshed.",
            "success"
          );

        } catch (error) {

          notice(
            error.message,
            "error"
          );
        }
      }
    );


  el("lockAdmin")
    .addEventListener(
      "click",
      function () {
        state.adminKey = "";
        state.command = null;
        state.submissions = [];
        state.events = [];

        el("adminWorkspace")
          .hidden =
            true;

        el("adminUnlock")
          .hidden =
            false;

        notice("");
      }
    );


  document
    .querySelector(
      ".admin-tabs"
    )
    .addEventListener(
      "click",
      function (event) {
        var button =
          event.target.closest(
            "[data-panel]"
          );

        if (!button) {
          return;
        }

        switchPanel(
          button.dataset.panel
        );
      }
    );


  document
    .addEventListener(
      "click",
      function (event) {

        var go =
          event.target.closest(
            "[data-go-panel]"
          );

        if (go) {
          switchPanel(
            go.dataset.goPanel
          );

          return;
        }


        var review =
          event.target.closest(
            "[data-review-action]"
          );

        if (review) {
          reviewSubmission(
            review
          );

          return;
        }


        var organization =
          event.target.closest(
            "[data-organization-action]"
          );

        if (organization) {
          updateOrganization(
            organization
          );

          return;
        }


        var eventButton =
          event.target.closest(
            "[data-event-action]"
          );

        if (eventButton) {
          updateEvent(
            eventButton
          );

          return;
        }


        var media =
          event.target.closest(
            "[data-media-action]"
          );

        if (media) {
          updateMedia(
            media
          );
        }
      }
    );


  el("submissionFilters")
    .addEventListener(
      "click",
      function (event) {
        var button =
          event.target.closest(
            "[data-submission-filter]"
          );

        if (!button) {
          return;
        }


        state.submissionFilter =
          button.dataset
            .submissionFilter;


        document
          .querySelectorAll(
            "[data-submission-filter]"
          )
          .forEach(
            function (item) {
              item.classList.toggle(
                "active",
                item === button
              );
            }
          );


        renderSubmissions();
      }
    );


  el("eventFilters")
    .addEventListener(
      "click",
      function (event) {
        var button =
          event.target.closest(
            "[data-event-filter]"
          );

        if (!button) {
          return;
        }


        state.eventFilter =
          button.dataset
            .eventFilter;


        document
          .querySelectorAll(
            "[data-event-filter]"
          )
          .forEach(
            function (item) {
              item.classList.toggle(
                "active",
                item === button
              );
            }
          );


        renderEvents();
      }
    );


  el("mediaFilters")
    .addEventListener(
      "click",
      function (event) {
        var button =
          event.target.closest(
            "[data-media-filter]"
          );

        if (!button) {
          return;
        }


        state.mediaFilter =
          button.dataset
            .mediaFilter;


        document
          .querySelectorAll(
            "[data-media-filter]"
          )
          .forEach(
            function (item) {
              item.classList.toggle(
                "active",
                item === button
              );
            }
          );


        renderMedia();
      }
    );


  el("organizationSearch")
    .addEventListener(
      "input",
      function (event) {
        state.organizationSearch =
          event.target.value;

        renderOrganizations();
      }
    );


  el("generateBrief")
    .addEventListener(
      "click",
      generateBrief
    );


  el("previewBrief")
    .addEventListener(
      "click",
      previewBrief
    );


  el("approveBrief")
    .addEventListener(
      "click",
      approveBrief
    );


  el("scheduleBrief")
    .addEventListener(
      "click",
      scheduleBrief
    );


  defaultMonth();

})();
