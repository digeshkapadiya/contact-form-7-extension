/**
 * WordPress PHP Code Generator for CF7 Integrations
 */
export class IntegrationPhpGenerator {
    static generateHookCode(integration) {
        const fnName = `cf7_integration_relay_${integration.formId}_${integration.type}`;
        const mappingsArray = integration.fieldMappings.map(m => {
            const cleanField = m.cf7Field.replace(/[\[\]]/g, '');
            return `        '${m.targetField}' => isset( $posted_data['${cleanField}'] ) ? sanitize_text_field( $posted_data['${cleanField}'] ) : '${m.defaultValue || ''}',`;
        }).join('\n');
        let authHeaders = '';
        if (integration.auth.type === 'bearer') {
            authHeaders = `        'Authorization' => 'Bearer ' . CF7_INT_SECRET_${integration.formId},`;
        }
        else if (integration.auth.type === 'apiKey') {
            const headerName = integration.auth.headerName || 'X-API-Key';
            authHeaders = `        '${headerName}' => CF7_INT_SECRET_${integration.formId},`;
        }
        return `<?php
/**
 * Contact Form 7 ${integration.provider || integration.type.toUpperCase()} Integration Relay
 *
 * Place this snippet in your child theme's functions.php or in a custom site plugin.
 * Form ID: ${integration.formId}
 * Target: ${integration.endpointUrl}
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Recommended: Store secret in wp-config.php rather than hardcoding in theme
if ( ! defined( 'CF7_INT_SECRET_${integration.formId}' ) ) {
    define( 'CF7_INT_SECRET_${integration.formId}', '${integration.auth.token || integration.auth.apiKey || ''}' );
}

add_action( 'wpcf7_mail_sent', '${fnName}', 20, 1 );

function ${fnName}( $contact_form ) {
    // Only execute for Form ID ${integration.formId}
    if ( (int) $contact_form->id() !== ${integration.formId} ) {
        return;
    }

    $submission = WPCF7_Submission::get_instance();
    if ( ! $submission ) {
        return;
    }

    $posted_data = $submission->get_posted_data();

    // 1. Build mapped payload
    $payload = [
${mappingsArray}
    ];

    // 2. Prepare HTTP request
    $endpoint = '${integration.endpointUrl}';
    $args = [
        'method'      => '${integration.httpMethod || 'POST'}',
        'timeout'     => 15,
        'redirection' => 5,
        'httpversion' => '1.1',
        'blocking'    => false, // Non-blocking dispatch to prevent slowing down user submission
        'headers'     => [
            'Content-Type' => 'application/json',
            'Accept'       => 'application/json',
${authHeaders}
        ],
        'body'        => wp_json_encode( $payload ),
        'data_format' => 'body',
    ];

    // 3. Dispatch safe HTTP POST
    $response = wp_safe_remote_post( $endpoint, $args );

    if ( is_wp_error( $response ) ) {
        error_log( sprintf( '[CF7 Integration Error] Form #%d failed to relay to %s: %s', ${integration.formId}, $endpoint, $response->get_error_message() ) );
    }
}
`;
    }
}
