(() => {
  "use strict";

  const API =
    "/api/nonprofits/portal/messages";


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


  const section =
    document.createElement(
      "section"
    );

  section.className =
    "link-message-center";

  section.innerHTML = `
    <h2>
      Messages with LINK
    </h2>

    <p class="link-message-center-intro">
      Send LINK a message or review communication
      connected to your organization.
    </p>

    <div
      id="link-message-list"
      class="link-message-list"
    >
      Loading messages…
    </div>

    <form
      id="link-message-form"
      class="link-message-form"
    >

      <input
        id="link-message-subject"
        type="text"
        maxlength="240"
        placeholder="Subject"
        required
      >

      <textarea
        id="link-message-body"
        rows="6"
        placeholder="Message LINK…"
        required
      ></textarea>

      <button type="submit">
        Send Message
      </button>

      <p
        id="link-message-status"
        class="link-message-status"
      ></p>

    </form>
  `;


  const target =
    document.querySelector(
      ".portal-shell"
    ) ||
    document.querySelector(
      "main"
    ) ||
    document.body;


  target.appendChild(
    section
  );


  const list =
    document.getElementById(
      "link-message-list"
    );


  async function load() {
    const response =
      await fetch(
        API,
        {
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    if (
      response.status === 401
    ) {
      section.hidden =
        true;

      return;
    }


    const payload =
      await response.json()
        .catch(
          () => ({})
        );


    if (!response.ok) {
      list.textContent =
        payload.error ||
        "Unable to load messages.";

      return;
    }


    const messages =
      payload.messages || [];


    if (!messages.length) {
      list.innerHTML =
        "<p>No messages yet.</p>";

      return;
    }


    list.innerHTML =
      messages
        .map(
          message => `
            <article
              class="link-message ${
                message.sender_type === "admin"
                  ? "is-admin"
                  : "is-nonprofit"
              }"
            >

              <div class="link-message-head">

                <strong>
                  ${
                    message.sender_type === "admin"
                      ? "LINK"
                      : "You"
                  }
                </strong>

                <span>
                  ${esc(date(message.created_at))}
                </span>

              </div>

              <p>
                <strong>
                  ${esc(message.subject)}
                </strong>
              </p>

              <div class="link-message-body">
                ${esc(message.body)}
              </div>

            </article>
          `
        )
        .join("");


    list.scrollTop =
      list.scrollHeight;
  }


  document
    .getElementById(
      "link-message-form"
    )
    .addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const status =
          document.getElementById(
            "link-message-status"
          );

        status.textContent =
          "Sending…";


        const response =
          await fetch(
            API,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json"
              },

              body:
                JSON.stringify({
                  subject:
                    document.getElementById(
                      "link-message-subject"
                    ).value,

                  body:
                    document.getElementById(
                      "link-message-body"
                    ).value
                })
            }
          );


        const payload =
          await response.json()
            .catch(
              () => ({})
            );


        if (!response.ok) {
          status.textContent =
            payload.error ||
            "Unable to send message.";

          return;
        }


        status.textContent =
          "Message sent to LINK.";

        document.getElementById(
          "link-message-subject"
        ).value = "";

        document.getElementById(
          "link-message-body"
        ).value = "";


        await load();
      }
    );


  load();

})();
