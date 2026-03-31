# Security Checklist

Use this checklist before each release to ensure security best practices.

## Pre-Release Security Checklist

### Dependency Management
- [ ] Run `npm audit` and address all HIGH and CRITICAL vulnerabilities
- [ ] Review `package-lock.json` for unexpected changes
- [ ] Check for outdated dependencies with `npm outdated`
- [ ] Update dev dependencies to latest stable versions
- [ ] Verify no hardcoded secrets or credentials in code

### Code Quality
- [ ] No console.error or console.log statements left for debugging
- [ ] Review all recent changes for security issues
- [ ] Check for XSS vulnerabilities in string handling
- [ ] Verify input validation for user-provided data
- [ ] Review sensitive operations and access controls

### Package Configuration
- [ ] Verify package.json metadata is complete:
  - [ ] name, version, description present
  - [ ] author with name and URL
  - [ ] license field set to MIT
  - [ ] repository URL correct
  - [ ] homepage and bugs URLs set
  - [ ] engines field specifies minimum Node.js version
- [ ] Check exports field is properly configured
- [ ] Verify main and module fields point to correct files

### Build and Distribution
- [ ] Run `npm run build` successfully
- [ ] Verify all output files are present:
  - [ ] dist/jsonview.js (ES module)
  - [ ] dist/jsonview.umd.cjs (UMD)
  - [ ] dist/jsonview.css (styles)
- [ ] Test built package with `npm pack --dry-run`
- [ ] Verify .npmignore excludes unnecessary files
- [ ] Check .gitignore prevents accidental commits

### Documentation
- [ ] SECURITY.md is present and up-to-date
- [ ] README.md accurately describes the package
- [ ] All public APIs are documented
- [ ] Security best practices are mentioned
- [ ] Vulnerability reporting instructions are clear

### Git and Repository
- [ ] All commits are properly signed (optional but recommended)
- [ ] Git history is clean with meaningful commit messages
- [ ] No sensitive data in git history (run `git log -p | grep -i password` to check)
- [ ] Tags follow semantic versioning (vX.Y.Z)
- [ ] CHANGELOG reflects all changes

### GitHub Configuration
- [ ] Branch protection rules are in place on main
- [ ] Require status checks before merging
- [ ] Require code reviews before merging
- [ ] Security workflows pass:
  - [ ] Security audit workflow
  - [ ] Lint and build checks
- [ ] GitHub Actions permissions are minimal

### Final Release Steps
- [ ] Create signed git tag: `git tag -s vX.Y.Z -m "Release vX.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] GitHub Actions publish workflow completes successfully
- [ ] Package appears on npm registry
- [ ] Verify package contents: `npm view @vdonec/json-view`
- [ ] Test installation in fresh project:
  ```bash
  mkdir test-project && cd test-project
  npm init -y
  npm install @vdonec/json-view
  ```

### Post-Release
- [ ] Monitor npm registry for issues
- [ ] Check Socket.dev score for changes
- [ ] Review GitHub security advisories
- [ ] Create issue/PR if any problems found

## Regular Maintenance

### Weekly
- [ ] Check for new vulnerabilities: `npm audit`
- [ ] Review GitHub security alerts

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review package score on Socket.dev
- [ ] Check for outdated Node.js versions

### Quarterly
- [ ] Full security audit of code
- [ ] Dependency update review
- [ ] Documentation review
- [ ] License compliance check

## Security Tools

### Recommended Tools
- **npm audit** - Check for known vulnerabilities
- **npm audit fix** - Auto-fix vulnerabilities where possible
- **synk** - Additional vulnerability scanning
- **OWASP Dependency-Check** - Comprehensive dependency analysis
- **Socket.dev** - Supply chain security monitoring

### Running Security Checks

```bash
# Check for vulnerabilities
npm audit

# Fix auto-fixable vulnerabilities
npm audit fix

# Check specific package versions
npm view @vdonec/json-view versions

# Analyze package size
npm pack
du -sh @vdonec-json-view-*.tgz

# Simulate publish
npm publish --dry-run
```

## Incident Response

If a security vulnerability is discovered:

1. **Assess Impact** - Determine severity and affected versions
2. **Notify Users** - Post to SECURITY.md if known issue
3. **Fix Issue** - Create and test fix in new branch
4. **Release Patch** - Publish new version with increment to patch number
5. **Document** - Update CHANGELOG and security advisories
6. **Monitor** - Track adoption of security update

## Security Contacts

- **Maintainer**: Pavel Grabovets (@vdonec)
- **Repository**: https://github.com/vdonec/json-view
- **Issue Tracker**: https://github.com/vdonec/json-view/issues
- **Security Advisories**: https://github.com/vdonec/json-view/security

---

Last updated: March 31, 2026

