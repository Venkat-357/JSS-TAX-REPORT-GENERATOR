# JSS Tax Report Generator - Application Overview

## Executive Summary

The JSS Tax Report Generator is a comprehensive web-based solution designed to streamline the management, tracking, and reporting of property tax payments across the JSS organization's extensive network of institutions. By digitizing the tax record-keeping process, the application ensures compliance, enhances transparency, and provides real-time insights to stakeholders at every level of the organizational hierarchy.

## Core Functionality

The application serves as a centralized repository for tax-related data, replacing manual record-keeping with a structured, digital workflow. It enables:

- **Digital Record Keeping:** Secure storage of tax payment details, receipts, and property documents.
- **Compliance Tracking:** Automated identification of institutions that have pending tax payments for the current fiscal year.
- **Report Generation:** Instant creation of comprehensive and local reports to aid in financial auditing and decision-making.
- **Evidence Management:** Upload and retrieval of digital copies of tax bills and receipts.

## User Roles & Hierarchy

The system is built around a strict hierarchical model that mirrors the organizational structure, ensuring data security and appropriate access control.

### 1. Admin (Top Level)

The Super User of the system with complete oversight.

- **Responsibilities:**
  - Manages Division Users (creation, modification, and oversight).
  - Oversees "Admin Properties" directly under the central trust.
  - Accesses global reports covering all divisions and institutions.
- **Value:** Provides a bird's-eye view of the entire organization's tax compliance status.

### 2. Division User (Mid Level)

Represents a regional or functional division overseeing multiple institutions.

- **Responsibilities:**
  - Manages Institution Users within their specific division.
  - Monitors tax payment status for all assigned institutions.
  - Receives alerts for non-compliant institutions (e.g., those who haven't paid the current year's tax).
- **Value:** Acts as a bridge between individual institutions and the central administration, ensuring regional compliance.

### 3. Institution User (Operational Level)

Represents individual entities (Schools, Colleges, Hostels, etc.).

- **Responsibilities:**
  - Enters detailed property tax payment information (Amount, Receipt No, Date, Dimensions, etc.).
  - Uploads digital proofs of payment (Scanned Bills/Receipts).
  - Maintains the profile of the institution (Location, Property ID, Khatha No).
- **Value:** Ensures accurate data entry at the source and maintains a digital history of the institution's payments.

## Data Flow Architecture

The application follows a **Bottom-Up Data Aggregation** model:

1. **Data Entry:** Institution Users input raw tax data and upload receipts.
2. **Verification & Aggregation:**
    - Data entered by Institutions becomes immediately visible to their respective Division Users.
    - Division Users can generate reports to aggregate data for all institutions under their purview.
3. **Global Oversight:**
    - Admins have visibility into all data across all Divisions.
    - Admins can generate "Comprehensive Reports" that summarize tax liabilities and payments across the entire organization.

## Technical Architecture

The application is built on a robust, modern tech stack designed for reliability and scalability:

- **Backend:** Node.js with Express.js for efficient request handling.
- **Database:** PostgreSQL for structured, relational data storage ensuring data integrity.
- **Frontend:** EJS (Embedded JavaScript) templating engine with Bootstrap for a responsive, user-friendly interface.
- **Deployment:** Dockerized environment for consistent deployment across development and production servers.

## Business Value

- **Reduced Administrative Burden:** Eliminates the need for manual spreadsheet consolidation.
- **Improved Compliance:** "Unpaid" alerts ensure no tax deadlines are missed, avoiding penalties.
- **Audit Readiness:** All historical data and proof-of-payment images are instantly retrievable for audits.
- **Data Integrity:** Structured data entry prevents common errors associated with manual reporting.
