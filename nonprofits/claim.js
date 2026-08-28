(() => {
  "use strict";

  const params =
    new URLSearchParams(
      window.location.search
    );


  const token =
    params.get(
      "token"
    ) || "";


  const $ =
    id =>
      document.getElementById(id);


  async function api(
    method,
    body
  ) {
    const url =
      method === "GET"
        ? `/api/nonprofits/claim?token=${encodeURIComponent(token)}`
        : "/api/nonprofits/claim";


    const response =
      await fetch(
        url,
        {
          method,

          credentials:
            "same-origin",

          headers:
            method === "POST"
              ? {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json"
                }
              : {
                  Accept:
                    "application/json"
                },

          body:
            method === "POST"
              ? JSON.stringify(
                  body
                )
              : undefined
        }
      );


    const payload =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (
      !response.ok
    ) {
      throw new Error(
        payload.error ||
        "Unable to use this invitation."
      );
    }


    return payload;
  }


  function showError(
    message
  ) {
    $("claim-loading").hidden =
      true;

    $("claim-card").hidden =
      true;

    $("claim-error").hidden =
      false;

    $("claim-error-text").textContent =
      message;
  }


  async function initialize() {
    if (
      !token
    ) {
      showError(
        "The secure invitation token is missing."
      );

      return;
    }


    try {
      const payload =
        await api(
          "GET"
        );


      $("claim-loading").hidden =
        true;

      $("claim-card").hidden =
        false;


      $("claim-org-name").textContent =
        payload.organization.name;


      $("claim-email").textContent =
        payload.maskedEmail;

    } catch (error) {
      showError(
        error.message
      );
    }
  }


  $("claim-form")
    .addEventListener(
      "submit",
      async event => {
        event.preventDefault();


        const result =
          $("claim-result");


        result.textContent =
          "Connecting your existing organization profile…";


        try {
          const payload =
            await api(
              "POST",
              {
                token,

                fullName:
                  $("claim-name")
                    .value,

                title:
                  $("claim-title")
                    .value,

                phone:
                  $("claim-phone")
                    .value
              }
            );


          result.textContent =
            "Profile claimed and submitted to LINK for review. Returning to nonprofit sign-in…";


          window.setTimeout(
            () => {
              window.location.assign(
                payload.portalUrl
              );
            },
            900
          );

        } catch (error) {
          result.textContent =
            error.message;
        }
      }
    );


  initialize();

})();
