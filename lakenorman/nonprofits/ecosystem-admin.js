(() => {
  "use strict";

  const API =
    "/api/nonprofits/admin/ecosystem";

  const STORAGE_KEY =
    "link_ecosystem_admin_secret";

  let secret =
    sessionStorage.getItem(
      STORAGE_KEY
    ) || "";

  let data = null;
  let searchTerm = "";
  let detailCounter = 0;

  const detailRecords =
    new Map();


  const $ =
    id =>
      document.getElementById(id);


  const auth =
    $("eco-auth");

  const app =
    $("eco-app");

  const authForm =
    $("eco-auth-form");

  const password =
    $("eco-password");

  const authError =
    $("eco-auth-error");

  const status =
    $("eco-status");

  const search =
    $("eco-search");

  const detail =
    $("eco-detail");


  function displayValue(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "Not provided";
    }

    if (
      typeof value === "boolean"
    ) {
      return value
        ? "Yes"
        : "No";
    }

    if (
      typeof value === "object"
    ) {
      return JSON.stringify(
        value,
        null,
        2
      );
    }

    return String(value);
  }


  function escapeHtml(value) {
    return displayValue(value)
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }


  function formatDate(value) {
    if (!value) {
      return "Not provided";
    }

    const parsed =
      new Date(value);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return displayValue(
        value
      );
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short"
      }
    ).format(parsed);
  }


  function field(
    label,
    value
  ) {
    return `
      <div class="eco-field">

        <strong>
          ${escapeHtml(label)}
        </strong>

        <div>
          ${escapeHtml(value)}
        </div>

      </div>
    `;
  }


  function fields(items) {
    return `
      <div class="eco-field-grid">
        ${
          items
            .map(
              ([label, value]) =>
                field(
                  label,
                  value
                )
            )
            .join("")
        }
      </div>
    `;
  }


  function section(
    title,
    content,
    privateSection = false
  ) {
    return `
      <section
        class="eco-detail-section ${
          privateSection
            ? "eco-admin-private"
            : ""
        }"
      >

        <h3>
          ${escapeHtml(title)}
        </h3>

        ${content}

      </section>
    `;
  }


  function jsonSection(
    title,
    value
  ) {
    return section(
      title,
      `<pre>${
        escapeHtml(
          JSON.stringify(
            value || [],
            null,
            2
          )
        )
      }</pre>`
    );
  }


  function matchesSearch(record) {
    if (!searchTerm) {
      return true;
    }

    return JSON.stringify(
      record
    )
      .toLowerCase()
      .includes(
        searchTerm
      );
  }


  function empty(message) {
    return `
      <div class="eco-empty">
        ${escapeHtml(message)}
      </div>
    `;
  }


  function registerDetail(
    type,
    title,
    record
  ) {
    detailCounter += 1;

    const id =
      String(detailCounter);

    detailRecords.set(
      id,
      {
        type,
        title,
        record
      }
    );

    return id;
  }


  function recordCard({
    title,
    subtitle,
    meta,
    type,
    record
  }) {
    const id =
      registerDetail(
        type,
        title,
        record
      );

    return `
      <article class="eco-record">

        <div class="eco-record-meta">

          <h3>
            ${escapeHtml(title)}
          </h3>

          ${
            subtitle
              ? `<p>${escapeHtml(subtitle)}</p>`
              : ""
          }

          ${
            meta
              ? `<p>${escapeHtml(meta)}</p>`
              : ""
          }

        </div>

        <button
          type="button"
          data-detail-id="${id}"
        >
          Open Full Record
        </button>

      </article>
    `;
  }


  async function requestData() {
    const response =
      await fetch(
        API,
        {
          headers: {
            Authorization:
              `Bearer ${secret}`,

            Accept:
              "application/json"
          }
        }
      );


    const payload =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (!response.ok) {
      const error =
        new Error(
          payload.error ||
          "Unable to load records."
        );

      error.status =
        response.status;

      throw error;
    }


    return payload;
  }


  function lockAdmin() {
    secret = "";
    data = null;

    sessionStorage.removeItem(
      STORAGE_KEY
    );

    app.hidden =
      true;

    auth.hidden =
      false;

    password.value =
      "";

    password.focus();
  }


  async function loadData() {
    status.textContent =
      "Loading ecosystem records…";

    authError.hidden =
      true;

    try {
      data =
        await requestData();

      auth.hidden =
        true;

      app.hidden =
        false;

      password.value =
        "";

      status.textContent =
        `Updated ${formatDate(
          data.generatedAt
        )}`;

      renderAll();

    } catch (error) {

      if (
        error.status === 401
      ) {
        sessionStorage.removeItem(
          STORAGE_KEY
        );

        secret = "";

        auth.hidden =
          false;

        app.hidden =
          true;

        authError.hidden =
          false;

        authError.textContent =
          "Admin password was not accepted.";

        return;
      }

      auth.hidden =
        false;

      app.hidden =
        true;

      authError.hidden =
        false;

      authError.textContent =
        error.message ||
        "Unable to load records.";
    }
  }


  function renderStats() {
    const labels = {
      nonprofits:
        "Nonprofits",

      businesses:
        "Businesses",

      community:
        "Community Profiles",

      resources:
        "Resources",

      resourceRequests:
        "Resource Requests",

      events:
        "Events",

      media:
        "Media",

      submissions:
        "Portal Submissions"
    };


    $("eco-stats").innerHTML =
      Object.entries(
        labels
      )
        .map(
          ([key, label]) => `
            <article class="eco-stat">

              <strong>
                ${
                  Number(
                    data.stats?.[key] || 0
                  )
                }
              </strong>

              <span>
                ${escapeHtml(label)}
              </span>

            </article>
          `
        )
        .join("");
  }


  function renderNonprofits() {
    const rows =
      (data.nonprofits || [])
        .filter(
          matchesSearch
        );


    $("eco-nonprofits").innerHTML =
      rows.length
        ? rows
          .map(
            record =>
              recordCard({
                title:
                  record.display_name,

                subtitle:
                  [
                    record.city,
                    record.state
                  ]
                    .filter(Boolean)
                    .join(", "),

                meta:
                  record.latest_submission
                    ? "Portal submission on file"
                    : "Public registry record",

                type:
                  "Nonprofit",

                record
              })
          )
          .join("")
        : empty(
            "No nonprofit records match this search."
          );
  }


  function renderBusinesses() {
    const rows =
      (data.businesses || [])
        .filter(
          matchesSearch
        );


    $("eco-businesses").innerHTML =
      rows.length
        ? rows
          .map(
            record =>
              recordCard({
                title:
                  record.business_name,

                subtitle:
                  record.contact_name,

                meta:
                  record.status,

                type:
                  "Business",

                record
              })
          )
          .join("")
        : empty(
            data.businesses?.length
              ? "No business records match this search."
              : "No business accounts have registered yet."
          );
  }


  function renderCommunity() {
    const rows =
      (data.community || [])
        .filter(
          matchesSearch
        );


    $("eco-community").innerHTML =
      rows.length
        ? rows
          .map(
            record =>
              recordCard({
                title:
                  record.display_name,

                subtitle:
                  record.participant_type,

                meta:
                  [
                    record.city,
                    record.state
                  ]
                    .filter(Boolean)
                    .join(", "),

                type:
                  "Community",

                record
              })
          )
          .join("")
        : empty(
            data.community?.length
              ? "No community records match this search."
              : "No community participant profiles have registered yet."
          );
  }


  function renderResources() {
    const items =
      (data.resources || [])
        .filter(
          matchesSearch
        );

    const requests =
      (data.resourceRequests || [])
        .filter(
          matchesSearch
        );


    let html = `
      <h3 class="eco-subheading">
        Resource Listings
      </h3>
    `;


    html +=
      items.length
        ? items
          .map(
            record =>
              recordCard({
                title:
                  record.title,

                subtitle:
                  record.business_name,

                meta:
                  record.status,

                type:
                  "Resource",

                record
              })
          )
          .join("")
        : empty(
            "No Resource Exchange listings yet."
          );


    html += `
      <h3 class="eco-subheading">
        Resource Requests
      </h3>
    `;


    html +=
      requests.length
        ? requests
          .map(
            record =>
              recordCard({
                title:
                  record.resource_title ||
                  "Resource Request",

                subtitle:
                  record.nonprofit_name,

                meta:
                  record.status,

                type:
                  "Resource Request",

                record
              })
          )
          .join("")
        : empty(
            "No Resource Exchange requests yet."
          );


    $("eco-resources").innerHTML =
      html;
  }


  function renderEventsMedia() {
    const events =
      (data.events || [])
        .filter(
          matchesSearch
        );

    const media =
      (data.media || [])
        .filter(
          matchesSearch
        );


    let html = `
      <h3 class="eco-subheading">
        Events
      </h3>
    `;


    html +=
      events.length
        ? events
          .map(
            record =>
              recordCard({
                title:
                  record.title,

                subtitle:
                  record.organization_name,

                meta:
                  formatDate(
                    record.starts_at
                  ),

                type:
                  "Event",

                record
              })
          )
          .join("")
        : empty(
            "No events have been submitted yet."
          );


    html += `
      <h3 class="eco-subheading">
        Media
      </h3>
    `;


    html +=
      media.length
        ? media
          .map(
            record =>
              recordCard({
                title:
                  record.file_name,

                subtitle:
                  record.organization_name,

                meta:
                  record.approved
                    ? "Approved"
                    : "Pending",

                type:
                  "Media",

                record
              })
          )
          .join("")
        : empty(
            "No media records match this search."
          );


    $("eco-events").innerHTML =
      html;
  }


  function renderSubmissions() {
    const rows =
      (data.submissions || [])
        .filter(
          matchesSearch
        );


    $("eco-submissions").innerHTML =
      rows.length
        ? rows
          .map(
            record =>
              recordCard({
                title:
                  record.organization_name,

                subtitle:
                  [
                    record.contact_name,
                    record.contact_title
                  ]
                    .filter(Boolean)
                    .join(" · "),

                meta:
                  [
                    record.status,
                    formatDate(
                      record.submitted_at
                    )
                  ]
                    .filter(Boolean)
                    .join(" · "),

                type:
                  "Portal Submission",

                record
              })
          )
          .join("")
        : empty(
            "No portal submissions match this search."
          );
  }


  function renderAll() {
    detailCounter = 0;
    detailRecords.clear();

    renderStats();
    renderNonprofits();
    renderBusinesses();
    renderCommunity();
    renderResources();
    renderEventsMedia();
    renderSubmissions();
  }


  function nonprofitDetail(record) {
    let html = "";


    html += section(
      "Organization Profile",
      fields([
        [
          "Organization",
          record.display_name
        ],
        [
          "Legal Name",
          record.legal_name
        ],
        [
          "Category",
          record.category
        ],
        [
          "Website",
          record.website_url
        ],
        [
          "Public Email",
          record.public_email
        ],
        [
          "Public Phone",
          record.public_phone
        ],
        [
          "Address",
          [
            record.address_line1,
            record.address_line2,
            record.city,
            record.state,
            record.postal_code
          ]
            .filter(Boolean)
            .join(", ")
        ],
        [
          "Mission",
          record.mission
        ],
        [
          "Who They Serve",
          record.who_they_serve
        ],
        [
          "Approval Status",
          record.approval_status
        ],
        [
          "Verification Status",
          record.verification_status
        ],
        [
          "Renewal Status",
          record.renewal_status
        ],
        [
          "Public Status",
          record.public_status
        ],
        [
          "Active",
          record.active
        ],
        [
          "Last Verified",
          formatDate(
            record.last_verified_at
          )
        ]
      ])
    );


    const submission =
      record.latest_submission;


    if (submission) {
      html += section(
        "Original Portal Submission — Admin Only",
        fields([
          [
            "Reference",
            submission.reference_code
          ],
          [
            "Submission Type",
            submission.submission_type
          ],
          [
            "Submission Status",
            submission.status
          ],
          [
            "Contact Name",
            submission.contact_name
          ],
          [
            "Contact Title",
            submission.contact_title
          ],
          [
            "Contact Email",
            submission.contact_email
          ],
          [
            "Contact Phone",
            submission.contact_phone
          ],
          [
            "Public Email Submitted",
            submission.public_email
          ],
          [
            "Public Phone Submitted",
            submission.public_phone
          ],
          [
            "Physical Address",
            submission.physical_address
          ],
          [
            "City",
            submission.city
          ],
          [
            "State",
            submission.state
          ],
          [
            "Postal Code",
            submission.postal_code
          ],
          [
            "Mission Submitted",
            submission.mission
          ],
          [
            "Service Areas",
            submission.service_areas
          ],
          [
            "Service Area Explanation",
            submission.service_area_explanation
          ],
          [
            "Needs",
            submission.needs_text
          ],
          [
            "Volunteer Opportunities",
            submission.volunteer_opportunities_text
          ],
          [
            "Donation Opportunities",
            submission.donation_opportunities_text
          ],
          [
            "Student Opportunities",
            submission.student_opportunities_text
          ],
          [
            "Business Opportunities",
            submission.business_opportunities_text
          ],
          [
            "Events",
            submission.events_text
          ],
          [
            "Facebook",
            submission.facebook_url
          ],
          [
            "Instagram",
            submission.instagram_url
          ],
          [
            "LinkedIn",
            submission.linkedin_url
          ],
          [
            "Other URL",
            submission.other_url
          ],
          [
            "Logo File",
            submission.logo_file_name
          ],
          [
            "Logo Storage",
            submission.logo_storage_url
          ],
          [
            "Authorized Representative",
            submission.authorized_representative
          ],
          [
            "Content Permission",
            submission.content_permission
          ],
          [
            "Accuracy Confirmation",
            submission.accuracy_confirmation
          ],
          [
            "Service Area Confirmation",
            submission.service_area_confirmation
          ],
          [
            "Policy Agreement",
            submission.policy_agreement
          ],
          [
            "Submitted",
            formatDate(
              submission.submitted_at
            )
          ],
          [
            "Reviewed",
            formatDate(
              submission.reviewed_at
            )
          ],
          [
            "Reviewed By",
            submission.reviewed_by
          ],
          [
            "Admin Notes",
            submission.admin_notes
          ]
        ]),
        true
      );
    }


    html += jsonSection(
      `Contacts (${record.contacts?.length || 0})`,
      record.contacts
    );

    html += jsonSection(
      `Service Areas (${record.service_areas?.length || 0})`,
      record.service_areas
    );

    html += jsonSection(
      `Needs (${record.needs?.length || 0})`,
      record.needs
    );

    html += jsonSection(
      `Opportunities (${record.opportunities?.length || 0})`,
      record.opportunities
    );

    html += jsonSection(
      `Events (${record.events?.length || 0})`,
      record.events
    );

    html += jsonSection(
      `Media (${record.assets?.length || 0})`,
      record.assets
    );


    return html;
  }


  function businessDetail(record) {
    let html = "";


    html += section(
      "Business Profile",
      fields([
        [
          "Business",
          record.business_name
        ],
        [
          "Contact Name",
          record.contact_name
        ],
        [
          "Email",
          record.email
        ],
        [
          "Phone",
          record.phone
        ],
        [
          "Website",
          record.website_url
        ],
        [
          "Logo",
          record.logo_url
        ],
        [
          "Status",
          record.status
        ],
        [
          "Plan Tier",
          record.plan_tier
        ],
        [
          "Listing Limit",
          record.active_listing_limit
        ],
        [
          "Public Profile",
          record.public_profile_enabled
        ],
        [
          "Public Logo",
          record.public_logo_enabled
        ],
        [
          "Public Link",
          record.public_link_enabled
        ],
        [
          "Featured Placement",
          record.featured_placement_enabled
        ],
        [
          "Expanded Impact",
          record.expanded_impact_enabled
        ],
        [
          "Partner Badge",
          record.partner_badge_enabled
        ],
        [
          "Leaderboard",
          record.leaderboard_opt_in
        ],
        [
          "Leaderboard Name",
          record.leaderboard_display_name
        ],
        [
          "Nonprofit Services",
          record.nonprofit_services_enabled
        ],
        [
          "Membership Started",
          formatDate(
            record.membership_started_at
          )
        ],
        [
          "Membership Renews",
          formatDate(
            record.membership_renews_at
          )
        ],
        [
          "Email Verified",
          formatDate(
            record.email_verified_at
          )
        ],
        [
          "Terms Accepted",
          formatDate(
            record.terms_accepted_at
          )
        ]
      ]),
      true
    );


    html += jsonSection(
      "Impact Metrics",
      record.impact
    );

    html += jsonSection(
      `Services (${record.services?.length || 0})`,
      record.services
    );

    html += jsonSection(
      `Resources (${record.resources?.length || 0})`,
      record.resources
    );


    return html;
  }


  function communityDetail(record) {
    return section(
      "Community Profile",
      fields([
        [
          "Participant Type",
          record.participant_type
        ],
        [
          "Display Name",
          record.display_name
        ],
        [
          "Public Display Name",
          record.public_display_name
        ],
        [
          "City",
          record.city
        ],
        [
          "State",
          record.state
        ],
        [
          "Postal Code",
          record.postal_code
        ],
        [
          "Preferred Radius",
          record.preferred_radius_miles
        ],
        [
          "Availability",
          record.availability_notes
        ],
        [
          "Leaderboard",
          record.leaderboard_opt_in
        ],
        [
          "Matching Enabled",
          record.matching_enabled
        ],
        [
          "Active",
          record.active
        ]
      ])
    );
  }


  function submissionDetail(record) {
    return section(
      "Original Portal Submission — Admin Only",
      fields([
        [
          "Reference",
          record.reference_code
        ],
        [
          "Organization",
          record.organization_name
        ],
        [
          "Website",
          record.website_url
        ],
        [
          "Public Email",
          record.public_email
        ],
        [
          "Public Phone",
          record.public_phone
        ],
        [
          "Physical Address",
          record.physical_address
        ],
        [
          "City",
          record.city
        ],
        [
          "State",
          record.state
        ],
        [
          "Postal Code",
          record.postal_code
        ],
        [
          "Category",
          record.category
        ],
        [
          "Mission",
          record.mission
        ],
        [
          "Service Areas",
          record.service_areas
        ],
        [
          "Service Explanation",
          record.service_area_explanation
        ],
        [
          "Contact Name",
          record.contact_name
        ],
        [
          "Contact Title",
          record.contact_title
        ],
        [
          "Contact Email",
          record.contact_email
        ],
        [
          "Contact Phone",
          record.contact_phone
        ],
        [
          "Needs",
          record.needs_text
        ],
        [
          "Volunteer Opportunities",
          record.volunteer_opportunities_text
        ],
        [
          "Donation Opportunities",
          record.donation_opportunities_text
        ],
        [
          "Student Opportunities",
          record.student_opportunities_text
        ],
        [
          "Business Opportunities",
          record.business_opportunities_text
        ],
        [
          "Events",
          record.events_text
        ],
        [
          "Facebook",
          record.facebook_url
        ],
        [
          "Instagram",
          record.instagram_url
        ],
        [
          "LinkedIn",
          record.linkedin_url
        ],
        [
          "Other URL",
          record.other_url
        ],
        [
          "Admin Notes",
          record.admin_notes
        ],
        [
          "Submitted",
          formatDate(
            record.submitted_at
          )
        ],
        [
          "Reviewed",
          formatDate(
            record.reviewed_at
          )
        ],
        [
          "Reviewed By",
          record.reviewed_by
        ]
      ]),
      true
    );
  }


  function genericDetail(record) {
    return section(
      "Complete Record",
      `<pre>${
        escapeHtml(
          JSON.stringify(
            record,
            null,
            2
          )
        )
      }</pre>`
    );
  }


  function openDetail(
    item
  ) {
    $("eco-detail-type").textContent =
      item.type;

    $("eco-detail-title").textContent =
      item.title;


    let content;


    if (
      item.type === "Nonprofit"
    ) {
      content =
        nonprofitDetail(
          item.record
        );
    }

    else if (
      item.type === "Business"
    ) {
      content =
        businessDetail(
          item.record
        );
    }

    else if (
      item.type === "Community"
    ) {
      content =
        communityDetail(
          item.record
        );
    }

    else if (
      item.type === "Portal Submission"
    ) {
      content =
        submissionDetail(
          item.record
        );
    }

    else {
      content =
        genericDetail(
          item.record
        );
    }


    $("eco-detail-content").innerHTML =
      content;

    detail.showModal();
  }


  function switchView(view) {
    document
      .querySelectorAll(
        ".eco-view"
      )
      .forEach(
        viewElement => {
          viewElement.hidden =
            viewElement.id !==
            `view-${view}`;
        }
      );


    document
      .querySelectorAll(
        "#eco-tabs [data-view]"
      )
      .forEach(
        button => {
          button.classList.toggle(
            "is-active",
            button.dataset.view === view
          );
        }
      );
  }


  authForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      secret =
        password.value;

      sessionStorage.setItem(
        STORAGE_KEY,
        secret
      );

      await loadData();
    }
  );


  $("eco-tabs").addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          "[data-view]"
        );

      if (!button) {
        return;
      }

      switchView(
        button.dataset.view
      );
    }
  );


  document.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          "[data-detail-id]"
        );

      if (!button) {
        return;
      }

      const item =
        detailRecords.get(
          button.dataset.detailId
        );

      if (item) {
        openDetail(
          item
        );
      }
    }
  );


  search.addEventListener(
    "input",
    () => {
      searchTerm =
        search.value
          .trim()
          .toLowerCase();

      renderAll();
    }
  );


  $("eco-refresh").addEventListener(
    "click",
    loadData
  );


  $("eco-lock").addEventListener(
    "click",
    lockAdmin
  );


  $("eco-detail-close").addEventListener(
    "click",
    () => {
      detail.close();
    }
  );


  detail.addEventListener(
    "click",
    event => {
      if (
        event.target === detail
      ) {
        detail.close();
      }
    }
  );


  if (secret) {
    loadData();
  } else {
    auth.hidden =
      false;

    app.hidden =
      true;
  }

})();
