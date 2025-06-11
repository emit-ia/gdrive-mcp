# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-06

### Added

**Core Features**
- Google Drive & Gmail MCP Server with hybrid authentication
- Service Account authentication for Google Drive (reliable, no expiration)
- OAuth2 authentication for Gmail (required for personal access)
- Automatic Gmail token refresh (prevents 6-month expiration)

**Google Drive API**
- File operations: list, get, upload, download, update, delete, copy, move
- Folder management: create, get info and contents
- Sharing & permissions: share files, manage permissions
- Search: advanced search with filters, recent files
- Collaboration: comments and revision history
- Account management and trash operations

**Gmail API**
- Message operations: list, get, send, search
- Message management: mark read/unread, detailed info
- Profile access and token status monitoring
- Full search query support with content extraction

**Technical**
- TypeScript implementation with full type safety
- Comprehensive error handling and logging
- Environment variable configuration
- MCP protocol compliance

**Documentation**
- Complete setup guides (README.md, HYBRID-AUTH-SETUP.md)
- Environment configuration examples
- Comprehensive inline code documentation
- Claude Desktop integration examples

### Security
- Zero hardcoded credentials
- Environment variable configuration
- Automatic token refresh
- Input validation and sanitization

### Notes
- Service Account files are isolated by design
- Gmail requires OAuth2 (Service Accounts cannot access personal Gmail)
- Google Workspace files require export for download 