/**
 * Contact Form 7 Tag Parser & Syntax Engine
 */
import { CF7ParsedTag } from '../wordpress/types.js';
export declare class CF7TagParser {
    /**
     * Parse all CF7 shortcode tags from form HTML/markup
     * Matches tags like: [text* your-name class:cf7-input placeholder "John"]
     */
    static parseFormTags(formMarkup: string): CF7ParsedTag[];
    /**
     * Tokenize tag body preserving double quoted strings
     */
    private static tokenizeTagBody;
    /**
     * Extract all mail tags referenced in a string (e.g. subject, body, headers, attachments)
     * Example: [your-name], [_raw_department], [_remote_ip]
     */
    static extractMailTags(text: string): string[];
}
