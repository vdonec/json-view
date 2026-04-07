# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please email the maintainer directly instead of using the issue tracker. This allows us to address the issue before public disclosure.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## Security Best Practices for Users

When using this library:

1. **Always use the latest version** - Keep the package updated to get security patches
2. **Regular audits** - Run `npm audit` regularly to check for known vulnerabilities
3. **Dependency updates** - Check and update dependencies in your projects
4. **Content Security Policy** - When rendering untrusted JSON data, consider implementing CSP headers

## Known Security Considerations

- This library is designed to render JSON data as DOM elements
- Ensure that any JSON data passed to this library is properly validated
- XSS Protection: JSON-derived keys/values are escaped before being injected into UI markup
- Always validate and sanitize user input before passing to JSON data structures

## Security Testing

- The project includes automated XSS regression coverage in `test/xss-regression.test.js`
- Run `npm run test` before releases and after changes in JSON rendering behavior

## Dependencies Security

This project uses minimal dependencies:
- **vite** (dev dependency only) - Used only during development and build time

The built package has **zero runtime dependencies**, making it inherently more secure with a minimal attack surface.

## Contact

For security concerns, please contact the maintainer privately before opening public issues.

