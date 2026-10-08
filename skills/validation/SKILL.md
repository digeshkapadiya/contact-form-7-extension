---
name: cf7-validation
description: Implement built-in and custom PHP validation rules using Contact Form 7 filter hooks, invalidation methods, and error messages.
---

# Contact Form 7 Validation Guide

Use this skill to implement both built-in validation options and custom server-side PHP validation hooks for WordPress Contact Form 7.

---

## Step 0: Connect the WordPress Site First

Before any live-site action (list, read, audit, create, update, test), call `wp_check_connection`.

If it is not connected, **stop and ask the user to connect their site** before drafting-and-creating. Ask for:
1. **Site URL** (e.g. `https://example.com`) and whether it is **staging or production**. Recommend staging first.
2. **WordPress username** and an **Application Password** (WordPress admin -> Users -> Profile -> Application Passwords -> Add).
3. Preferred way to store them: `/plugin` -> cf7-developer-assistant -> **Configure options** (password kept as a sensitive value). Otherwise call `wp_add_site` and `wp_select_site` with the details the user gives you.

Then re-run `wp_check_connection` and confirm Contact Form 7 is detected. Only then create or change anything. If the user only wants markup or code (no live site), skip this step and say the form will not be created on a site.

---

## Built-In Validation Capabilities

Contact Form 7 provides native validation through form tag attributes:

| Field Type | Built-In Validation Attributes | Example |
| :--- | :--- | :--- |
| **Required** | Asterisk `*` appended to tag type | `[text* user-name]` |
| **Number / Range** | `min:N`, `max:N`, `step:N` | `[number* quantity min:1 max:100 step:5]` |
| **Date** | `min:YYYY-MM-DD`, `max:YYYY-MM-DD` | `[date* event-date min:2026-01-01]` |
| **File** | `filetypes:ext1\|ext2`, `limit:size` | `[file* resume filetypes:pdf\|docx limit:5mb]` |
| **Text Length** | `minlength:N`, `maxlength:N` | `[textarea* feedback minlength:20 maxlength:500]` |

---

## Custom PHP Validation Hooks

CF7 fires specific filter hooks for each field type during form validation.

### Validation Filter Naming Convention
* `wpcf7_validate_text` & `wpcf7_validate_text*`
* `wpcf7_validate_email` & `wpcf7_validate_email*`
* `wpcf7_validate_tel` & `wpcf7_validate_tel*`
* `wpcf7_validate_number` & `wpcf7_validate_number*`
* `wpcf7_validate_date` & `wpcf7_validate_date*`
* `wpcf7_validate_textarea` & `wpcf7_validate_textarea*`
* `wpcf7_validate_file` & `wpcf7_validate_file*`
* `wpcf7_validate_select` & `wpcf7_validate_select*`
* `wpcf7_validate_checkbox` & `wpcf7_validate_checkbox*`
* `wpcf7_validate` (Global multi-field validation hook)

---

## Implementation Patterns

### Where to Place Custom PHP Code
Always place custom validation code in:
1. A **Child Theme's `functions.php`** file (`/wp-content/themes/your-child-theme/functions.php`), OR
2. A **Custom Site Plugin** (`/wp-content/plugins/site-custom-cf7/site-custom-cf7.php`).

> **Warning**: Never place custom hooks in a parent theme (it will be overwritten on updates) or in the core CF7 plugin files.

---

### Pattern 1: Custom Phone Number Validation

Validates international or specific format phone numbers (e.g. 10+ digits, standard format).

```php
add_filter( 'wpcf7_validate_tel', 'custom_cf7_validate_phone_number', 20, 2 );
add_filter( 'wpcf7_validate_tel*', 'custom_cf7_validate_phone_number', 20, 2 );

function custom_cf7_validate_phone_number( $result, $tag ) {
    $tag = new WPCF7_FormTag( $tag );
    $name = $tag->name;

    if ( 'user-phone' === $name ) {
        $value = isset( $_POST[$name] ) ? trim( sanitize_text_field( wp_unslash( $_POST[$name] ) ) ) : '';

        // Allow empty if not required, but if filled or required, validate format
        if ( ! empty( $value ) ) {
            // Check for valid international or standard phone pattern (7 to 15 digits)
            $clean_phone = preg_replace( '/[^0-9]/', '', $value );
            if ( strlen( $clean_phone ) < 10 || strlen( $clean_phone ) > 15 ) {
                $result->invalidate( $tag, __( 'Please enter a valid phone number (10–15 digits).', 'textdomain' ) );
            }
        }
    }

    return $result;
}
```

---

### Pattern 2: Corporate / Business Email Only (Block Free Email Providers)

Restricts submissions to business emails by blocking popular free mail providers (`gmail.com`, `yahoo.com`, `hotmail.com`, etc.).

```php
add_filter( 'wpcf7_validate_email', 'custom_cf7_require_business_email', 20, 2 );
add_filter( 'wpcf7_validate_email*', 'custom_cf7_require_business_email', 20, 2 );

function custom_cf7_require_business_email( $result, $tag ) {
    $tag = new WPCF7_FormTag( $tag );
    $name = $tag->name;

    if ( 'business-email' === $name ) {
        $email = isset( $_POST[$name] ) ? sanitize_email( wp_unslash( $_POST[$name] ) ) : '';

        if ( ! empty( $email ) ) {
            $blocked_domains = [
                'gmail.com',
                'yahoo.com',
                'hotmail.com',
                'outlook.com',
                'aol.com',
                'icloud.com',
                'mail.com',
                'zoho.com',
                'protonmail.com',
                'yandex.com'
            ];

            $domain = substr( strrchr( $email, '@' ), 1 );
            if ( in_array( strtolower( $domain ), $blocked_domains, true ) ) {
                $result->invalidate( $tag, __( 'Please use your corporate/company email address.', 'textdomain' ) );
            }
        }
    }

    return $result;
}
```

---

### Pattern 3: Cross-Field Conditional Validation (Global Hook)

Requires a secondary field only when a specific option is chosen in a select dropdown.

```php
add_filter( 'wpcf7_validate', 'custom_cf7_conditional_field_validation', 20, 2 );

function custom_cf7_conditional_field_validation( $result, $tags ) {
    $inquiry_type = isset( $_POST['inquiry-type'] ) ? sanitize_text_field( wp_unslash( $_POST['inquiry-type'] ) ) : '';
    $other_details = isset( $_POST['other-details'] ) ? trim( sanitize_text_field( wp_unslash( $_POST['other-details'] ) ) ) : '';

    if ( 'Other' === $inquiry_type && empty( $other_details ) ) {
        $result->invalidate( 'other-details', __( 'Please provide details when selecting "Other".', 'textdomain' ) );
    }

    return $result;
}
```
