(() => {
  "use strict";

  const status =
    document.getElementById(
      "events-status"
    );

  const grid =
    document.getElementById(
      "events-grid"
    );

  const empty =
    document.getElementById(
      "events-empty"
    );


  function firstValue(
    object,
    keys
  ) {

    for (
      const key
      of keys
    ) {

      if (
        object &&
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ""
      ) {
        return object[key];
      }
    }

    return "";
  }


  function formatDate(raw) {

    if (!raw) {
      return "";
    }

    const date =
      new Date(raw);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(raw);
    }

    return (
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "America/New_York",

          weekday:
            "short",

          month:
            "short",

          day:
            "numeric",

          year:
            "numeric",

          hour:
            "numeric",

          minute:
            "2-digit"
        }
      )
      .format(date)
    );
  }


  function textElement(
    tag,
    className,
    content
  ) {

    const element =
      document.createElement(
        tag
      );

    if (className) {
      element.className =
        className;
    }

    element.textContent =
      content;

    return element;
  }


  function renderEvent(
    event
  ) {

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "event-card";


    const body =
      document.createElement(
        "div"
      );

    body.className =
      "event-card-body";


    const category =
      firstValue(
        event,
        ["category"]
      );

    if (category) {

      body.appendChild(
        textElement(
          "p",
          "event-category",
          category
        )
      );
    }


    const title =
      firstValue(
        event,
        [
          "title",
          "name"
        ]
      )
      || "Community Event";


    body.appendChild(
      textElement(
        "h3",
        "",
        title
      )
    );


    const start =
      firstValue(
        event,
        [
          "starts_at",
          "startsAt",
          "start"
        ]
      );

    if (start) {

      body.appendChild(
        textElement(
          "p",
          "event-date",
          formatDate(start)
        )
      );
    }


    const location = [
      firstValue(
        event,
        [
          "location_name",
          "locationName"
        ]
      ),

      firstValue(
        event,
        ["city"]
      ),

      firstValue(
        event,
        ["state"]
      )
    ].filter(Boolean);


    if (location.length) {

      body.appendChild(
        textElement(
          "p",
          "event-location",
          location.join(" · ")
        )
      );
    }


    const description =
      firstValue(
        event,
        ["description"]
      );

    if (description) {

      const display =
        description.length > 280
          ? (
              description.slice(
                0,
                277
              )
              + "…"
            )
          : description;

      body.appendChild(
        textElement(
          "p",
          "event-description",
          display
        )
      );
    }


    const url =
      firstValue(
        event,
        [
          "event_url",
          "eventUrl",
          "source_url",
          "sourceUrl"
        ]
      );

    if (url) {

      const link =
        document.createElement(
          "a"
        );

      link.className =
        "event-link";

      link.href =
        url;

      link.textContent =
        "Event Details";

      if (
        /^https?:\/\//i.test(
          url
        )
      ) {

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";
      }

      body.appendChild(
        link
      );
    }


    card.appendChild(
      body
    );

    return card;
  }


  async function loadEvents() {

    try {

      const response =
        await fetch(
          "/api/events/public",
          {
            headers: {
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

        throw new Error(
          payload.error
          || "Unable to load events."
        );
      }


      let events =
        payload.events
        || payload.items
        || payload.data
        || [];


      if (
        !Array.isArray(events)
        &&
        events
        &&
        Array.isArray(
          events.events
        )
      ) {

        events =
          events.events;
      }


      if (
        !Array.isArray(events)
      ) {

        events = [];
      }


      status.hidden =
        true;


      if (
        !events.length
      ) {

        empty.hidden =
          false;

        return;
      }


      grid.innerHTML =
        "";


      for (
        const event
        of events
      ) {

        grid.appendChild(
          renderEvent(event)
        );
      }


      grid.hidden =
        false;

    } catch (error) {

      status.textContent =
        "Community events could not be loaded right now.";

      console.error(
        error
      );
    }
  }


  loadEvents();
})();
