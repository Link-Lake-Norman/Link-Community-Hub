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

      var formData =
        new FormData(form);

      var serviceAreas =
        formData.getAll(
          "serviceAreas"
        );

      var submissionType =
        String(
          formData.get("submissionType") || ""
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

        var successHtml;

        if (
          submissionType === "update" ||
          submissionType === "renewal"
        ) {
          successHtml =
            "<strong>Your LINK nonprofit update has been received.</strong>" +
            "<br>Your current organization listing remains active while LINK reviews your updates." +
            "<br>After approval, the authorized contact email you submitted can be used to access the secure LINK Nonprofit Portal." +
            "<br><strong>Reference:</strong> " +
            String(data.reference || "");
        } else {
          successHtml =
            "<strong>Submission received.</strong>" +
            "<br>Your organization has been placed in the LINK review queue." +
            "<br><strong>Reference:</strong> " +
            String(data.reference || "");
        }

        showMessage(
          "success",
          successHtml
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
