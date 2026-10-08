<?php
/**
 * Contact Form 7 Dynamic Recipient Routing Hooks
 *
 * Dynamically alters email recipients, subjects, or carbon copies based on submitted form values.
 *
 * @package CF7_Developer_Assistant
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Route email recipient dynamically based on form submission data
 */
add_filter( 'wpcf7_mail_components', 'cf7_assistant_dynamic_recipient_routing', 20, 3 );

function cf7_assistant_dynamic_recipient_routing( $components, $form, $mail ) {
    $submission = WPCF7_Submission::get_instance();

    if ( ! $submission ) {
        return $components;
    }

    $posted_data = $submission->get_posted_data();

    // Example 1: Route based on location / region
    if ( isset( $posted_data['customer-region'] ) ) {
        $region = sanitize_text_field( $posted_data['customer-region'] );

        switch ( strtolower( $region ) ) {
            case 'north-america':
                $components['recipient'] = 'na-sales@yourdomain.com';
                break;
            case 'europe':
                $components['recipient'] = 'eu-sales@yourdomain.com';
                break;
            case 'asia-pacific':
                $components['recipient'] = 'apac-sales@yourdomain.com';
                break;
            default:
                $components['recipient'] = 'global-sales@yourdomain.com';
                break;
        }
    }

    return $components;
}
