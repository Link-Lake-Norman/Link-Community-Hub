(() => {
  "use strict";

  const API =
    "/api/nonprofits/admin/communications";

  const STORAGE =
    "link_nonprofit_comm_admin_secret";

  let secret =
    sessionStorage.getItem(
      STORAGE
    ) || "";

  let data = {
    organizations: [],
    messages: [],
    campaigns: []
  };

  let selected =
    new Set();


  const $ =
    id =>
      document.getElementById(id);


  function esc(value) {
    return String(
      value ?? ""
    )
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


  function date(value) {
    if (!value) {
      return "";
    }

    const parsed =
      new Date(value);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return String(value);
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


  function emailFor(org) {
    return (
      org.contact_email ||
      org.public_email ||
      org.submission_email ||
      ""
    );
  }


  function claimStatus(org) {
    return String(
      org?.claim_status ||
      "unclaimed"
    )
      .trim()
      .toLowerCase();
  }

  function claimed(org) {
    return claimStatus(org) === "approved";
  }

  function claimNeedsInvite(org) {
    return claimStatus(org) === "unclaimed";
  }

  function claimStatusLabel(org) {
    const status = claimStatus(org);

    if (status === "approved") {
      return "Approved · Portal Ready";
    }

    if (status === "pending-review") {
      return "Claimed · Pending LINK Review";
    }

    return "Unclaimed · Needs Claim";
  }


  async function api(
    options = {}
  ) {
    const response =
      await fetch(
        API,
        {
          ...options,

          headers: {
            Authorization:
              `Bearer ${secret}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            ...(options.headers || {})
          }
        }
      );

    const payload =
      await response.json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      const error =
        new Error(
          payload.error ||
          "Request failed."
        );

      error.status =
        response.status;

      throw error;
    }

    return payload;
  }


  async function load() {
    try {
      const payload =
        await api();

      data =
        payload;

      $("comm-login").hidden =
        true;

      $("comm-app").hidden =
        false;

      render();

      $("comm-provider").textContent =
        payload.emailProvider ===
        "not_configured"
          ? "Portal messaging is active. External email delivery is not configured yet; claim links can still be copied from Admin responses."
          : `Email notifications: ${payload.emailProvider}`;

    } catch (error) {
      if (
        error.status === 401
      ) {
        sessionStorage.removeItem(
          STORAGE
        );

        secret = "";

        $("comm-login").hidden =
          false;

        $("comm-app").hidden =
          true;

        $("comm-login-error").hidden =
          false;

        $("comm-login-error").textContent =
          "Admin password was not accepted.";

        return;
      }

      $("comm-result").textContent =
        error.message;
    }
  }


  function renderSummary() {
    const organizations =
      data.organizations || [];

    $("comm-total").textContent =
      organizations.length;

    $("comm-claimed").textContent =
      organizations
        .filter(
          claimed
        )
        .length;

    $("comm-unclaimed").textContent =
      organizations
        .filter(
          org =>
            claimNeedsInvite(org)
        )
        .length;

    $("comm-unread").textContent =
      organizations
        .reduce(
          (
            total,
            org
          ) =>
            total +
            Number(
              org.unread_admin_count || 0
            ),
          0
        );
  }


  function renderOrganizations() {
    const query =
      $("comm-search")
        .value
        .trim()
        .toLowerCase();

    const organizations =
      (data.organizations || [])
        .filter(
          org =>
            !query ||
            JSON.stringify(org)
              .toLowerCase()
              .includes(query)
        );


    $("comm-organizations").innerHTML =
      organizations
        .map(
          org => {
            const email =
              emailFor(org);

            const isClaimed =
              claimed(org);

            const unread =
              Number(
                org.unread_admin_count || 0
              );

            return `
              <label class="comm-org">

                <input
                  type="checkbox"
                  data-org-id="${esc(org.id)}"
                  ${
                    selected.has(org.id)
                      ? "checked"
                      : ""
                  }
                >

                <span>

                  <span class="comm-org-name">
                    ${esc(org.display_name)}
                  </span>

                  <span class="comm-org-meta">
                    ${
                      email
                        ? esc(email)
                        : "No email on file"
                    }
                  </span>

                </span>

                <span>

                  ${
                    unread
                      ? `<span class="comm-status unread">${unread} new</span>`
                      : ""
                  }

                  <span class="comm-status ${
                    isClaimed
                      ? ""
                      : "unclaimed"
                  }">
                    ${
                      claimStatusLabel(org)
                    }
                  </span>

                </span>

              </label>
            `;
          }
        )
        .join("");


    updateSelectedLabel();
  }


  function renderHistory() {
    const messages =
      data.messages || [];

    if (!messages.length) {
      $("comm-history").innerHTML =
        `<p>No messages yet.</p>`;

      return;
    }


    $("comm-history").innerHTML =
      messages
        .map(
          message => `
            <article class="comm-message">

              <div class="comm-message-head">

                <div>

                  <strong>
                    ${esc(message.organization_name)}
                  </strong>

                  <div class="comm-message-meta">
                    ${
                      message.sender_type === "admin"
                        ? "LINK → Nonprofit"
                        : "Nonprofit → LINK"
                    }
                    ·
                    ${esc(date(message.created_at))}
                  </div>

                </div>

                <div class="comm-message-meta">
                  ${
                    message.email_status
                      ? `Email: ${esc(message.email_status)}`
                      : ""
                  }
                </div>

              </div>

              <p>
                <strong>${esc(message.subject)}</strong>
              </p>

              <p>${esc(message.body)}</p>

            </article>
          `
        )
        .join("");
  }


  function updateSelectedLabel() {
    const count =
      selected.size;

    $("comm-selected-label").textContent =
      count === 0
        ? "No nonprofits selected."
        : count === 1
          ? "1 nonprofit selected."
          : `${count} nonprofits selected.`;
  }


  function render() {
    renderSummary();
    renderOrganizations();
    renderHistory();
  }


  $("comm-login-form")
    .addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        secret =
          $("comm-password")
            .value;

        sessionStorage.setItem(
          STORAGE,
          secret
        );

        $("comm-login-error").hidden =
          true;

        await load();
      }
    );


  $("comm-organizations")
    .addEventListener(
      "change",
      event => {
        const input =
          event.target.closest(
            "[data-org-id]"
          );

        if (!input) {
          return;
        }

        if (input.checked) {
          selected.add(
            input.dataset.orgId
          );
        } else {
          selected.delete(
            input.dataset.orgId
          );
        }

        updateSelectedLabel();
      }
    );


  $("comm-search")
    .addEventListener(
      "input",
      renderOrganizations
    );


  $("comm-select-all")
    .addEventListener(
      "click",
      () => {
        for (
          const org
          of data.organizations || []
        ) {
          selected.add(
            org.id
          );
        }

        renderOrganizations();
      }
    );


  $("comm-select-unclaimed")
    .addEventListener(
      "click",
      () => {
        selected.clear();

        for (
          const org
          of data.organizations || []
        ) {
          if (claimNeedsInvite(org)) {
            selected.add(
              org.id
            );
          }
        }

        renderOrganizations();
      }
    );


  $("comm-clear")
    .addEventListener(
      "click",
      () => {
        selected.clear();
        renderOrganizations();
      }
    );


  $("comm-send-message")
    .addEventListener(
      "click",
      async () => {
        const ids =
          [...selected];

        const subject =
          $("comm-subject")
            .value
            .trim();

        const body =
          $("comm-body")
            .value
            .trim();


        if (
          !ids.length ||
          !subject ||
          !body
        ) {
          $("comm-result").textContent =
            "Select recipient(s) and enter a subject and message.";

          return;
        }


        $("comm-result").textContent =
          "Sending…";


        try {
          const payload =
            await api({
              method:
                "POST",

              body:
                JSON.stringify(
                  ids.length === 1
                    ? {
                        action:
                          "send_message",

                        organizationId:
                          ids[0],

                        subject,

                        body
                      }
                    : {
                        action:
                          "send_bulk_message",

                        organizationIds:
                          ids,

                        subject,

                        body
                      }
                )
            });


          const results =
            payload.results ||
            (
              payload.result
                ? [payload.result]
                : []
            );

          const sent =
            results.filter(
              result =>
                result.delivery
                  ?.status === "sent"
            ).length;

          $("comm-result").textContent =
            ids.length === 1
              ? `Message saved. Email status: ${
                  results[0]
                    ?.delivery
                    ?.status ||
                  "unknown"
                }.`
              : `Bulk message created for ${ids.length} nonprofits. ${sent} email notification(s) sent.`;

          await load();

        } catch (error) {
          $("comm-result").textContent =
            error.message;
        }
      }
    );


  $("comm-send-claim")
    .addEventListener(
      "click",
      async () => {
        const ids =
          [...selected];

        if (!ids.length) {
          $("comm-result").textContent =
            "Select at least one nonprofit.";

          return;
        }


        $("comm-result").textContent =
          "Creating secure claim/update invitation(s)…";


        try {
          const payload =
            await api({
              method:
                "POST",

              body:
                JSON.stringify(
                  ids.length === 1
                    ? {
                        action:
                          "send_claim_invite",

                        organizationId:
                          ids[0]
                      }
                    : {
                        action:
                          "send_bulk_claim_invites",

                        organizationIds:
                          ids
                      }
                )
            });


          if (
            ids.length === 1
          ) {
            const status =
              payload.delivery
                ?.status ||
              payload.status ||
              "created";

            $("comm-result").textContent =
              payload.claimUrl
                ? `Claim/update link created. Email status: ${status}. Secure link: ${payload.claimUrl}`
                : `Invitation status: ${status}.`;

          } else {
            const results =
              payload.results || [];

            const ready =
              results
                .filter(
                  item =>
                    item.ok
                )
                .length;

            const missing =
              results
                .filter(
                  item =>
                    item.status ===
                    "missing_email"
                )
                .length;

            $("comm-result").textContent =
              `${ready} claim/update invitation(s) created. ${missing} nonprofit(s) need an email added first.`;
          }


          await load();

        } catch (error) {
          $("comm-result").textContent =
            error.message;
        }
      }
    );


  $("comm-approve-claim")
    .addEventListener(
      "click",
      async () => {
        const ids =
          [...selected];


        if (
          ids.length !== 1
        ) {
          $("comm-result").textContent =
            "Select exactly one nonprofit with a claim pending LINK review.";

          return;
        }


        const organization =
          (data.organizations || [])
            .find(
              org =>
                String(org.id) ===
                String(ids[0])
            );


        if (
          !organization
        ) {
          $("comm-result").textContent =
            "The selected nonprofit could not be found. Refresh and try again.";

          return;
        }


        if (
          claimStatus(organization) !==
          "pending-review"
        ) {
          $("comm-result").textContent =
            claimStatus(organization) ===
              "approved"
              ? `${organization.display_name} is already approved and portal-ready.`
              : `${organization.display_name} must complete its claim before LINK can approve portal access.`;

          return;
        }


        const confirmed =
          window.confirm(
            `Approve ${organization.display_name} for LINK nonprofit portal access?

This confirms the organization has completed its claim and LINK has reviewed the claimed contact.`
          );


        if (
          !confirmed
        ) {
          return;
        }


        $("comm-result").textContent =
          `Approving ${organization.display_name}…`;


        try {
          const payload =
            await api({
              method:
                "POST",

              body:
                JSON.stringify({
                  action:
                    "approve_claim",

                  organizationId:
                    organization.id
                })
            });


          $("comm-result").textContent =
            payload.message ||
            `${organization.display_name} is approved and portal-ready.`;


          selected.delete(
            organization.id
          );


          await load();

        } catch (
          error
        ) {
          $("comm-result").textContent =
            error.message;
        }
      }
    );


  $("comm-refresh")
    .addEventListener(
      "click",
      load
    );


  if (secret) {
    load();
  }

})();
