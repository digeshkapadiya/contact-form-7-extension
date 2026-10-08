/**
 * Contact Form 7 Configuration Diff & Comparison Engine
 */
export class CF7DiffEngine {
    static compare(before, after, beforeLabel = 'Snapshot', afterLabel = 'Current Form') {
        const diffs = [];
        // 1. Title
        if (before.title !== after.title) {
            diffs.push({
                field: 'title',
                type: 'modified',
                before: before.title,
                after: after.title,
                explanation: `Form title changed from "${before.title}" to "${after.title}".`
            });
        }
        // 2. Form Markup
        if ((before.form || '') !== (after.form || '')) {
            diffs.push({
                field: 'form_markup',
                type: 'modified',
                before: before.form || '',
                after: after.form || '',
                explanation: 'Form HTML structure or tags have been modified.'
            });
        }
        // 3. Mail settings
        const mailKeys = [
            'sender',
            'recipient',
            'subject',
            'additional_headers',
            'body',
            'attachments'
        ];
        const bMail = before.mail || {};
        const aMail = after.mail || {};
        for (const k of mailKeys) {
            const bVal = String(bMail[k] || '');
            const aVal = String(aMail[k] || '');
            if (bVal !== aVal) {
                diffs.push({
                    field: `mail.${k}`,
                    type: !bVal ? 'added' : !aVal ? 'removed' : 'modified',
                    before: bVal,
                    after: aVal,
                    explanation: `Mail ${k} changed.`
                });
            }
        }
        // 4. Additional Settings
        if ((before.additional_settings || '') !== (after.additional_settings || '')) {
            diffs.push({
                field: 'additional_settings',
                type: 'modified',
                before: before.additional_settings,
                after: after.additional_settings,
                explanation: 'CF7 additional settings modified.'
            });
        }
        return {
            formId: after.id || before.id,
            beforeLabel,
            afterLabel,
            hasChanges: diffs.length > 0,
            totalDiffs: diffs.length,
            diffs
        };
    }
}
