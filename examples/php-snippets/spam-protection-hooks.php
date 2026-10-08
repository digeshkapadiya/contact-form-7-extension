<?php
/**
 * Contact Form 7 Anti-Spam and Security Hooks
 *
 * Place this file in your child theme's functions.php or in a dedicated site plugin.
 *
 * @package CF7_Developer_Assistant
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * 1. Honeypot Validation Filter
 *
 * Validates hidden honeypot fields. If filled, aborts submission as spam.
 */
add_filter( 'wpcf7_spam', 'cf7_assistant_honeypot_check', 10, 2 );

function cf7_assistant_honeypot_check( $spam, $submission ) {
    if ( $spam ) {
        return $spam;
    }

    $honeypot_fields = [ 'website-verify', 'cf7-hp-field', 'realname-verify' ];

    foreach ( $honeypot_fields as $field_name ) {
        if ( ! empty( $_POST[ $field_name ] ) ) {
            // Field was filled by automated bot
            return true;
        }
    }

    return $spam;
}

/**
 * 2. Tune Google reCAPTCHA v3 Score Threshold
 *
 * Default CF7 threshold is 0.50. Lower to 0.30 if legitimate users get false-positive orange borders.
 */
add_filter( 'wpcf7_recaptcha_threshold', 'cf7_assistant_tune_recaptcha_threshold', 10, 1 );

function cf7_assistant_tune_recaptcha_threshold( $threshold ) {
    // Range is 0.0 (most permissive) to 1.0 (most strict)
    return 0.35;
}

/**
 * 3. Email Header Injection Sanitizer
 *
 * Ensures line-break characters are stripped from custom email components.
 */
add_filter( 'wpcf7_mail_components', 'cf7_assistant_sanitize_mail_components', 10, 3 );

function cf7_assistant_sanitize_mail_components( $components, $form, $mail ) {
    if ( isset( $components['subject'] ) ) {
        $components['subject'] = preg_replace( '/[\r\n\t]/', ' ', $components['subject'] );
    }

    if ( isset( $components['recipient'] ) ) {
        $components['recipient'] = preg_replace( '/[\r\n\t]/', ' ', $components['recipient'] );
    }

    return $components;
}
