# Contributing to json-view

Thank you for considering contributing to json-view! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome all contributors regardless of background
- Report harassment or inappropriate behavior to the maintainer

## Ways to Contribute

### Reporting Bugs
- Check existing issues to avoid duplicates
- Describe the bug clearly with reproduction steps
- Include your environment (browser, Node.js version, OS)
- Provide code examples when possible

### Reporting Security Vulnerabilities
**Do not create a public GitHub issue for security vulnerabilities.**
Instead, please email the maintainer privately or use GitHub's security advisory feature.
See [SECURITY.md](./SECURITY.md) for details.

### Proposing Features
- Open an issue to discuss the feature first
- Explain the use case and expected behavior
- Provide examples of how it would be used
- Be open to feedback and suggestions

### Code Contributions
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test your changes: run `npm run test` (required), then use `npm run dev` for manual UI checks if needed
5. Commit with clear messages: `git commit -m "Add feature: description"`
6. Push to your fork
7. Create a Pull Request

## Development Setup

```bash
# Clone repository
git clone https://github.com/vdonec/json-view.git
cd json-view

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview build output
npm run preview
```

## Code Style

- Use consistent indentation (2 spaces)
- Use meaningful variable names
- Add comments for complex logic
- Follow existing code patterns

## Testing

- Test your changes locally before submitting PR
- Run `npm run test` and keep `test/xss-regression.test.js` passing
- Test in both ES module and UMD builds
- Test in different browsers if possible
- Verify no console errors or warnings

## Commit Guidelines

- Use clear, descriptive commit messages
- Start with a verb: "Add", "Fix", "Update", "Remove"
- Keep commits focused on a single change
- Reference issues when relevant: "Fixes #123"

Example:
```
Add feature to expand/collapse specific nodes

- Add expandNode() method
- Add collapseNode() method
- Update API documentation
```

## Pull Request Process

1. Update the README.md if needed
2. Ensure code follows project style
3. Include description of changes
4. Link related issues
5. Wait for review and address feedback

## License

By contributing to this project, you agree that your contributions will be licensed under its MIT License.

## Questions?

- Check existing issues and discussions
- Create a new discussion for questions
- Contact the maintainer directly for security concerns

---

Thank you for contributing! 🎉

