# Contributing to CF7 Developer Assistant

Thank you for your interest in improving **CF7 Developer Assistant**! We welcome community contributions to help WordPress developers build better, safer, and more reliable Contact Form 7 forms.

---

## Code of Conduct

Please adhere to respectful, collaborative, and constructive communication at all times.

---

## Development & Skill Guidelines

When contributing new skills, examples, or documentation:

1. **Official Standards**: Always use official WordPress coding standards and Contact Form 7 APIs. Never invent unsupported hooks, tags, or options.
2. **Safe Code Execution**:
   - Always sanitize and unslash input data: `sanitize_text_field( wp_unslash( $_POST['field'] ) )`.
   - Never place or recommend placement of custom code inside parent themes or core plugin directories.
3. **No External Bloat**: Prefer clean Vanilla CSS and lightweight Vanilla JavaScript without external dependencies.
4. **Skill Frontmatter**: Every `SKILL.md` must include valid YAML frontmatter:
   ```yaml
   ---
   name: skill-identifier
   description: One-line concise summary of what this skill does.
   ---
   ```

---

## Submitting a Pull Request

1. Fork the repository and create a descriptive branch:
   ```bash
   git checkout -b feature/add-new-validation-recipe
   ```
2. Make your additions or fixes.
3. Verify that all Markdown links and code snippets work cleanly.
4. Run through the verification points in [TESTING.md](TESTING.md).
5. Open a Pull Request against `main` with a clear description of the changes.

---

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
