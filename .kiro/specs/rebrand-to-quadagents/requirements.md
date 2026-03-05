# Requirements Document

## Introduction

This document specifies the requirements for rebranding the application from "Lovable App" to "QuadAgents". The rebranding involves updating the application name across all user-facing surfaces and removing the logo/icon that currently appears next to the application name in the header.

## Glossary

- **Application**: The React/TypeScript frontend web application
- **Header**: The top navigation bar component that displays the application branding
- **Browser_Tab**: The browser tab that displays the page title
- **Meta_Tags**: HTML metadata elements used for SEO and social media sharing
- **Logo_Icon**: The visual icon element (currently a Leaf icon) displayed next to the application name

## Requirements

### Requirement 1: Update Application Name in Browser Tab

**User Story:** As a user, I want to see "QuadAgents" as the browser tab title, so that I can easily identify the application among my open tabs.

#### Acceptance Criteria

1. THE Application SHALL display "QuadAgents" as the document title in the browser tab
2. THE Application SHALL display "QuadAgents" in the og:title meta tag for social media sharing

### Requirement 2: Update Application Name in Header

**User Story:** As a user, I want to see "QuadAgents" displayed in the application header, so that I know which application I am using.

#### Acceptance Criteria

1. THE Header SHALL display "QuadAgents" as the application name text
2. THE Header SHALL use the same font styling and size as the current application name

### Requirement 3: Remove Logo Icon from Header

**User Story:** As a user, I want a clean header without an icon, so that the focus is on the application name.

#### Acceptance Criteria

1. THE Header SHALL NOT display any logo icon element next to the application name
2. THE Header SHALL NOT display any background container for a logo icon
3. THE Header SHALL maintain proper spacing and alignment after icon removal

### Requirement 4: Update Metadata Descriptions

**User Story:** As a developer, I want updated metadata descriptions, so that search engines and social media platforms display accurate information about QuadAgents.

#### Acceptance Criteria

1. THE Application SHALL update the meta description to reference "QuadAgents"
2. THE Application SHALL update the og:description meta tag to reference "QuadAgents"
3. THE Application SHALL update the author meta tag if it references the old branding
