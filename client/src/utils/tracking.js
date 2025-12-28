export function sendGA4Event(eventCategory, eventAction, eventLabel) {
  if (window.gtag) {
    window.gtag('event', eventAction, {
      'event_category': eventCategory,
      'event_label': eventLabel
    });
  }
}
