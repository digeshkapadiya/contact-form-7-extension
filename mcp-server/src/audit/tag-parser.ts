/**
 * Contact Form 7 Tag Parser & Syntax Engine
 */

import { CF7ParsedTag } from '../wordpress/types.js';

export class CF7TagParser {
  /**
   * Parse all CF7 shortcode tags from form HTML/markup
   * Matches tags like: [text* your-name class:cf7-input placeholder "John"]
   */
  public static parseFormTags(formMarkup: string): CF7ParsedTag[] {
    if (!formMarkup) return [];

    const tags: CF7ParsedTag[] = [];
    // Regex matching [tag-type(*) name ... "values"]
    const tagRegex = /\[([a-zA-Z0-9_*]+)(?:\s+([^\]]+))?\]/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(formMarkup)) !== null) {
      const fullTag = match[0];
      const typeRaw = match[1];
      const body = match[2] || '';

      // Skip closing tags like [/acceptance] or special shortcodes that aren't CF7 fields
      if (typeRaw.startsWith('/')) continue;

      const isRequired = typeRaw.endsWith('*');
      const baseType = isRequired ? typeRaw.slice(0, -1) : typeRaw;

      // Extract parts tokenized by spaces or quotes
      const tokens = this.tokenizeTagBody(body);
      const name = tokens.length > 0 && !tokens[0].includes(':') && !tokens[0].startsWith('"') ? tokens[0] : '';

      const options: string[] = [];
      const values: string[] = [];
      const pipes: { label: string; value: string }[] = [];
      let isAkismet = false;
      let akismetType: 'author' | 'author_email' | 'author_url' | undefined;
      const fileTypes: string[] = [];
      let fileLimit: string | undefined;

      for (let i = (name ? 1 : 0); i < tokens.length; i++) {
        const token = tokens[i];
        if (token.startsWith('"') && token.endsWith('"')) {
          const val = token.slice(1, -1);
          values.push(val);
          if (val.includes('|')) {
            const [label, pipeVal] = val.split('|');
            pipes.push({ label: label.trim(), value: pipeVal.trim() });
          }
        } else if (token.startsWith('akismet:')) {
          isAkismet = true;
          const sub = token.replace('akismet:', '');
          if (sub === 'author' || sub === 'author_email' || sub === 'author_url') {
            akismetType = sub;
          }
        } else if (token.startsWith('filetypes:')) {
          fileTypes.push(...token.replace('filetypes:', '').split('|'));
        } else if (token.startsWith('limit:')) {
          fileLimit = token.replace('limit:', '');
        } else {
          options.push(token);
        }
      }

      tags.push({
        raw: fullTag,
        type: typeRaw,
        baseType,
        isRequired,
        name,
        options,
        values,
        pipes: pipes.length > 0 ? pipes : undefined,
        isAkismet,
        akismetType,
        fileTypes: fileTypes.length > 0 ? fileTypes : undefined,
        fileLimit
      });
    }

    return tags;
  }

  /**
   * Tokenize tag body preserving double quoted strings
   */
  private static tokenizeTagBody(str: string): string[] {
    const tokens: string[] = [];
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
      tokens.push(match[0]);
    }

    return tokens;
  }

  /**
   * Extract all mail tags referenced in a string (e.g. subject, body, headers, attachments)
   * Example: [your-name], [_raw_department], [_remote_ip]
   */
  public static extractMailTags(text: string): string[] {
    if (!text) return [];
    const mailTagRegex = /\[([a-zA-Z0-9_\-]+)\]/g;
    const tags: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = mailTagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }

    return [...new Set(tags)];
  }
}
