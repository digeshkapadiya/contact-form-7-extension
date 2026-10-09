<?php
/**
 * Plugin Name: CF7 Submissions Bridge
 * Description: Stores Contact Form 7 submissions in WordPress and exposes them (plus Flamingo messages) through an authenticated REST API for the CF7 Developer Assistant for Claude.
 * Version: 1.0.0
 * Requires at least: 5.6
 * Requires PHP: 7.4
 * License: MIT
 * Text Domain: cf7-submissions-bridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CF7SB_VERSION', '1.0.0' );
define( 'CF7SB_POST_TYPE', 'cf7sb_submission' );

/**
 * Private post type that holds submissions captured by this plugin.
 */
add_action( 'init', function () {
	register_post_type( CF7SB_POST_TYPE, array(
		'label'               => 'CF7 Submissions',
		'public'              => false,
		'show_ui'             => false,
		'show_in_rest'        => false,
		'exclude_from_search' => true,
		'supports'            => array( 'title' ),
		'rewrite'             => false,
		'query_var'           => false,
	) );
} );

/**
 * Field names that must never be stored (captcha tokens, nonces, internals).
 */
function cf7sb_is_ignored_field( $name ) {
	if ( 0 === strpos( $name, '_' ) ) {
		return true;
	}
	return in_array( $name, array( 'g-recaptcha-response', 'h-captcha-response', 'cf-turnstile-response' ), true );
}

/**
 * Capture every valid, non-spam submission before mail is sent, so the data
 * is kept even when wp_mail() fails on the server.
 */
add_action( 'wpcf7_before_send_mail', function ( $contact_form ) {
	if ( ! class_exists( 'WPCF7_Submission' ) ) {
		return;
	}
	$submission = WPCF7_Submission::get_instance();
	if ( ! $submission ) {
		return;
	}

	$fields = array();
	foreach ( (array) $submission->get_posted_data() as $name => $value ) {
		if ( cf7sb_is_ignored_field( (string) $name ) ) {
			continue;
		}
		$fields[ $name ] = is_array( $value )
			? array_map( 'sanitize_textarea_field', array_map( 'strval', $value ) )
			: sanitize_textarea_field( (string) $value );
	}

	// Uploaded files: keep names only, never the file contents or server paths.
	$files = array();
	foreach ( (array) $submission->uploaded_files() as $name => $paths ) {
		$files[ $name ] = array_map( 'basename', (array) $paths );
	}

	$title = $contact_form->title();
	foreach ( array( 'your-subject', 'subject' ) as $key ) {
		if ( ! empty( $fields[ $key ] ) && is_string( $fields[ $key ] ) ) {
			$title = $fields[ $key ];
			break;
		}
	}

	$post_id = wp_insert_post( array(
		'post_type'   => CF7SB_POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => wp_strip_all_tags( $title ),
	), true );
	if ( is_wp_error( $post_id ) || ! $post_id ) {
		return;
	}

	update_post_meta( $post_id, '_form_id', (int) $contact_form->id() );
	update_post_meta( $post_id, '_form_title', $contact_form->title() );
	update_post_meta( $post_id, '_fields', wp_slash( wp_json_encode( $fields ) ) );
	update_post_meta( $post_id, '_files', wp_slash( wp_json_encode( $files ) ) );
	update_post_meta( $post_id, '_meta', wp_slash( wp_json_encode( array(
		'remote_ip'  => (string) $submission->get_meta( 'remote_ip' ),
		'user_agent' => (string) $submission->get_meta( 'user_agent' ),
		'url'        => (string) $submission->get_meta( 'url' ),
		'timestamp'  => (int) $submission->get_meta( 'timestamp' ),
	) ) ) );
}, 5 );

/**
 * Only people who may already read stored messages can use the API.
 */
function cf7sb_can_read() {
	return current_user_can( 'manage_options' ) || current_user_can( 'flamingo_edit_inbound_messages' );
}

function cf7sb_permission() {
	if ( cf7sb_can_read() ) {
		return true;
	}
	return new WP_Error( 'cf7sb_forbidden', 'You are not allowed to read form submissions.', array( 'status' => rest_authorization_required_code() ) );
}

function cf7sb_flamingo_active() {
	return post_type_exists( 'flamingo_inbound' );
}

/**
 * Resolve the Flamingo channel slug for a CF7 form id.
 */
function cf7sb_form_slug( $form_id ) {
	$post = get_post( (int) $form_id );
	return ( $post && 'wpcf7_contact_form' === $post->post_type ) ? $post->post_name : '';
}

function cf7sb_json_meta( $post_id, $key ) {
	$decoded = json_decode( (string) get_post_meta( $post_id, $key, true ), true );
	return is_array( $decoded ) ? $decoded : array();
}

function cf7sb_format_own( WP_Post $post ) {
	$meta = cf7sb_json_meta( $post->ID, '_meta' );
	return array(
		'id'         => 'cf7sb-' . $post->ID,
		'source'     => 'bridge',
		'form_id'    => (int) get_post_meta( $post->ID, '_form_id', true ),
		'form_title' => (string) get_post_meta( $post->ID, '_form_title', true ),
		'subject'    => $post->post_title,
		'date'       => get_post_time( 'c', true, $post ),
		'fields'     => cf7sb_json_meta( $post->ID, '_fields' ),
		'files'      => cf7sb_json_meta( $post->ID, '_files' ),
		'meta'       => $meta,
	);
}

function cf7sb_format_flamingo( WP_Post $post ) {
	$fields = array();
	foreach ( (array) get_post_meta( $post->ID ) as $key => $values ) {
		if ( 0 === strpos( $key, '_field_' ) ) {
			$value                              = maybe_unserialize( $values[0] );
			$fields[ substr( $key, 7 ) ]        = $value;
		}
	}
	$channels = wp_get_object_terms( $post->ID, 'flamingo_inbound_channel', array( 'fields' => 'slugs' ) );
	$channel  = ( ! is_wp_error( $channels ) && $channels ) ? $channels[0] : '';
	$form_id  = 0;
	$form_ttl = '';
	if ( $channel ) {
		$forms = get_posts( array( 'post_type' => 'wpcf7_contact_form', 'name' => $channel, 'numberposts' => 1, 'post_status' => 'any' ) );
		if ( $forms ) {
			$form_id  = (int) $forms[0]->ID;
			$form_ttl = $forms[0]->post_title;
		}
	}
	return array(
		'id'         => 'flamingo-' . $post->ID,
		'source'     => 'flamingo',
		'form_id'    => $form_id,
		'form_title' => $form_ttl ? $form_ttl : $channel,
		'subject'    => (string) get_post_meta( $post->ID, '_subject', true ),
		'date'       => get_post_time( 'c', true, $post ),
		'from_name'  => (string) get_post_meta( $post->ID, '_from_name', true ),
		'from_email' => (string) get_post_meta( $post->ID, '_from_email', true ),
		'spam'       => (bool) get_post_meta( $post->ID, '_spam', true ),
		'fields'     => $fields,
		'meta'       => maybe_unserialize( get_post_meta( $post->ID, '_meta', true ) ),
	);
}

/**
 * Flamingo stores a message per submission; if Flamingo is active and this
 * plugin also captured it we would list it twice, so "auto" prefers Flamingo.
 */
function cf7sb_resolve_source( $requested ) {
	if ( 'flamingo' === $requested ) {
		return cf7sb_flamingo_active() ? 'flamingo' : '';
	}
	if ( 'bridge' === $requested ) {
		return 'bridge';
	}
	return cf7sb_flamingo_active() ? 'flamingo' : 'bridge';
}

function cf7sb_query_args( $source, WP_REST_Request $request ) {
	$args = array(
		'post_type'      => 'flamingo' === $source ? 'flamingo_inbound' : CF7SB_POST_TYPE,
		'post_status'    => 'any',
		'posts_per_page' => min( 100, max( 1, (int) $request->get_param( 'per_page' ) ?: 20 ) ),
		'paged'          => max( 1, (int) $request->get_param( 'page' ) ?: 1 ),
		'orderby'        => 'date',
		'order'          => 'DESC',
	);

	$search = (string) $request->get_param( 'search' );
	if ( '' !== $search ) {
		$args['s'] = $search;
	}

	$after = (string) $request->get_param( 'after' );
	if ( '' !== $after ) {
		$args['date_query'] = array( array( 'after' => $after, 'inclusive' => true ) );
	}

	$form_id = (int) $request->get_param( 'form_id' );
	if ( $form_id ) {
		if ( 'flamingo' === $source ) {
			$slug = cf7sb_form_slug( $form_id );
			// An unknown form must match nothing rather than everything.
			$args['tax_query'] = array( array(
				'taxonomy' => 'flamingo_inbound_channel',
				'field'    => 'slug',
				'terms'    => $slug ? $slug : '__none__',
			) );
		} else {
			$args['meta_query'] = array( array( 'key' => '_form_id', 'value' => $form_id, 'type' => 'NUMERIC' ) );
		}
	}

	if ( 'flamingo' === $source && ! filter_var( $request->get_param( 'include_spam' ), FILTER_VALIDATE_BOOLEAN ) ) {
		$args['post_status'] = 'publish';
	}
	return $args;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'cf7-bridge/v1', '/status', array(
		'methods'             => 'GET',
		'permission_callback' => 'cf7sb_permission',
		'callback'            => function () {
			$own = wp_count_posts( CF7SB_POST_TYPE );
			$fla = cf7sb_flamingo_active() ? wp_count_posts( 'flamingo_inbound' ) : null;
			return array(
				'bridge_version'  => CF7SB_VERSION,
				'cf7_active'      => class_exists( 'WPCF7_ContactForm' ),
				'flamingo_active' => cf7sb_flamingo_active(),
				'default_source'  => cf7sb_resolve_source( 'auto' ),
				'counts'          => array(
					'bridge'   => (int) $own->publish,
					'flamingo' => $fla ? (int) $fla->publish : null,
				),
			);
		},
	) );

	register_rest_route( 'cf7-bridge/v1', '/submissions', array(
		'methods'             => 'GET',
		'permission_callback' => 'cf7sb_permission',
		'callback'            => function ( WP_REST_Request $request ) {
			$source = cf7sb_resolve_source( (string) $request->get_param( 'source' ) );
			if ( '' === $source ) {
				return new WP_Error( 'cf7sb_no_flamingo', 'Flamingo is not active on this site.', array( 'status' => 400 ) );
			}
			$query = new WP_Query( cf7sb_query_args( $source, $request ) );
			$items = array_map( 'flamingo' === $source ? 'cf7sb_format_flamingo' : 'cf7sb_format_own', $query->posts );
			return array(
				'source'      => $source,
				'total'       => (int) $query->found_posts,
				'total_pages' => (int) $query->max_num_pages,
				'items'       => $items,
			);
		},
	) );

	register_rest_route( 'cf7-bridge/v1', '/submissions/(?P<id>(?:flamingo|cf7sb)-\d+)', array(
		'methods'             => 'GET',
		'permission_callback' => 'cf7sb_permission',
		'callback'            => function ( WP_REST_Request $request ) {
			list( $prefix, $id ) = explode( '-', $request['id'] );
			$post = get_post( (int) $id );
			$type = 'flamingo' === $prefix ? 'flamingo_inbound' : CF7SB_POST_TYPE;
			if ( ! $post || $post->post_type !== $type ) {
				return new WP_Error( 'cf7sb_not_found', 'Submission not found.', array( 'status' => 404 ) );
			}
			return 'flamingo' === $prefix ? cf7sb_format_flamingo( $post ) : cf7sb_format_own( $post );
		},
	) );
} );
