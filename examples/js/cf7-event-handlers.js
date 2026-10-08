/**
 * Contact Form 7 DOM Event Handlers
 * 
 * Vanilla JavaScript listeners for CF7 custom DOM events:
 * - Conversion tracking (Google Analytics 4 / Google Tag Manager)
 * - Thank-you page redirection
 * - UI animations and button states
 */

document.addEventListener('DOMContentLoaded', function () {

  /**
   * 1. On Mail Sent Successfully (`wpcf7mailsent`)
   */
  document.addEventListener('wpcf7mailsent', function (event) {
    const formId = event.detail.contactFormId;
    const formInputs = event.detail.inputs;

    console.info('Contact Form 7 [Mail Sent]:', {
      formId: formId,
      detail: event.detail
    });

    // A. Track event in Google Analytics 4 (gtag)
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', {
        form_id: formId,
        form_name: 'CF7 Form ' + formId
      });
    }

    // B. Push event to Google Tag Manager dataLayer
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: 'cf7_form_submission',
        cf7_form_id: formId
      });
    }

    // C. Optional: Redirect to a custom Thank You page after 1.5 seconds
    /*
    setTimeout(function() {
      window.location.href = '/thank-you/';
    }, 1500);
    */
  }, false);

  /**
   * 2. On Validation Failure (`wpcf7invalid`)
   */
  document.addEventListener('wpcf7invalid', function (event) {
    console.warn('Contact Form 7 [Validation Error]:', event.detail);

    // Smooth scroll to the first invalid field
    const invalidField = document.querySelector('.wpcf7-not-valid');
    if (invalidField) {
      invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      invalidField.focus();
    }
  }, false);

  /**
   * 3. On Spam Detected (`wpcf7spam`)
   */
  document.addEventListener('wpcf7spam', function (event) {
    console.warn('Contact Form 7 [Spam Detected]: Submission flagged by anti-spam filters.', event.detail);
  }, false);

  /**
   * 4. On Submission Started (`wpcf7submit`)
   */
  document.addEventListener('wpcf7submit', function (event) {
    console.log('Contact Form 7 [Submit Initiated]:', event.detail);
  }, false);

});
