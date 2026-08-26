(function () {
  "use strict";

  var form =
    document.getElementById(
      "nonprofitRegistrationForm"
    );

  var message =
    document.getElementById(
      "submissionMessage"
    );

  if (!form || !message) {
    return;
  }

  function showMessage(
    type,
    html
  ) {
    message.hidden = false;

    message.className =
      "link-submission-message " +
      type;

    message.innerHTML = html;
  }

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      message.hidden = true;

      var serviceAreas =
        new FormData(form)
          .getAll(
            "serviceAreas"
          );

      if (!serviceAreas.length) {
        showMessage(
          "error",
          "Please select at least one Lake Norman service area."
        );

        return;
      }

      var button =
        form.querySelector(
          'button[type="submit"]'
        );

      var originalText =
        button
          ? button.textContent
          : "";

      if (button) {
        button.disabled = true;
        button.textContent =
          "SUBMITTING...";
      }

      try {
        var response =
          await fetch(
            "/api/nonprofits/submit",
            {
              method: "POST",
              body:
                new FormData(form)
            }
          );

        var data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
            "Submission could not be completed."
          );
        }

        form.reset();

        showMessage(
          "success",
          "<strong>Submission received.</strong>" +
          "<br>Your organization has been placed in the LINK review queue." +
          "<br><strong>Reference:</strong> " +
          String(data.reference || "")
        );

        message.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      } catch (error) {
        showMessage(
          "error",
          String(
            error.message ||
            "Submission could not be completed."
          )
        );
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent =
            originalText;
        }
      }
    }
  );
})();
