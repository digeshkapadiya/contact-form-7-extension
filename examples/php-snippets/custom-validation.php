<?php
/**
 * Contact Form 7 Custom Validation Snippets
 *
 * Place this file in your child theme's functions.php or in a dedicated site plugin.
 *
 * @package CF7_Developer_Assistant
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Prevent direct access
}

/**
 * 1. Validate Phone Number (Digits length & international formatting)
 */
add_filter( 'wpcf7_validate_tel', 'cf7_assistant_validate_phone_number', 20, 2 );
add_filter( 'wpcf7_validate_tel*', 'cf7_assistant_validate_phone_number', 20, 2 );

function cf7_assistant_validate_phone_number( $result, $tag ) {
    $tag = new WPCF7_FormTag( $tag );
    $name = $tag->name;

    if ( in_array( $name, [ 'your-phone', 'user-phone', 'applicant-phone' ], true ) ) {
        $value = isset( $_POST[ $name ] ) ? trim( sanitize_text_field( wp_unslash( $_POST[ $name ] ) ) ) : '';

        if ( ! empty( $value ) ) {
            $digits_only = preg_replace( '/[^0-9]/', '', $value );
            if ( strlen( $digits_only ) < 10 || strlen( $digits_only ) > 15 ) {
                $result->invalidate( $tag, __( 'Please enter a valid phone number (10 to 15 digits).', 'textdomain' ) );
            }
        }
    }

    return $result;
}

/**
 * 2. Validate Corporate Email (Disallow free public webmail domains)
 */
add_filter( 'wpcf7_validate_email', 'cf7_assistant_validate_corporate_email', 20, 2 );
add_filter( 'wpcf7_validate_email*', 'cf7_assistant_validate_corporate_email', 20, 2 );

function cf7_assistant_validate_corporate_email( $result, $tag ) {
    $tag = new WPCF7_FormTag( $tag );
    $name = $tag->name;

    if ( in_array( $name, [ 'corporate-email', 'business-email', 'client-email' ], true ) ) {
        $email = isset( $_POST[ $name ] ) ? sanitize_email( wp_unslash( $_POST[ $name ] ) ) : '';

        if ( ! empty( $email ) ) {
            $blocked_domains = [
                'gmail.com',
                'yahoo.com',
                'hotmail.com',
                'outlook.com',
                'live.com',
                'aol.com',
                'icloud.com',
                'mail.com',
                'protonmail.com'
            ];

            $email_parts = explode( '@', strtolower( $email ) );
            $domain = end( $email_parts );

            if ( in_array( $domain, $blocked_domains, true ) ) {
                $result->invalidate( $tag, __( 'Please provide an official business email address (e.g. name@company.com).', 'textdomain' ) );
            }
        }
    }

    return $result;
}

/**
 * 3. Validate Maximum Word Count in Message Textarea
 */
add_filter( 'wpcf7_validate_textarea', 'cf7_assistant_validate_textarea_word_count', 20, 2 );
add_filter( 'wpcf7_validate_textarea*', 'cf7_assistant_validate_textarea_word_count', 20, 2 );

function cf7_assistant_validate_textarea_word_count( $result, $tag ) {
    $tag = new WPCF7_FormTag( $tag );
    $name = $tag->name;

    if ( 'your-message' === $name || 'project-summary' === $name ) {
        $message = isset( $_POST[ $name ] ) ? trim( sanitize_textarea_field( wp_unslash( $_POST[ $name ] ) ) ) : '';

        if ( ! empty( $message ) ) {
            $word_count = str_word_count( $message );
            $max_words = 300;

            if ( $word_count > $max_words ) {
                $result->invalidate( $tag, sprintf( __( 'Your message exceeds the %d word limit (currently %d words).', 'textdomain' ), $max_words, $word_count ) );
            }
        }
    }

    return $result;
}
