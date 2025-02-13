# JSS Tax Report Generator Documentation

## Overview

The JSS Tax Report Generator is a web application that helps manage and generate property tax reports for JSS institutions efficiently. It provides a hierarchical user system with admins, division users, and institution users, each with specific roles and capabilities for managing property tax records.

## Requirements

### System Requirements

- Node.js 18+
- PostgreSQL database
- Modern web browser
- Docker (optional)

### Dependencies

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "body-parser": "^1.20.2", 
    "connect-flash": "^0.1.1",
    "connect-pg-simple": "^9.0.1",
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.12.0"
  }
}
```

## System Architecture

### User Hierarchy

The application has three main user roles with specific permissions and responsibilities:

1. Admin Users
   - Manage division users
   - View all institution users
   - View all payment details
   - Generate comprehensive and local reports
   - Add temporary payment records (These records can then be transferred to the respective institutions as needed)

2. Division Users  
   - Manage institution users in their division
   - View payment details for their institutions
   - Approve institution payment records
   - Generate division-level reports

3. Institution Users
   - Manage their payment details
   - Generate institution-specific reports
   - Upload payment records and bills

### Database Schema

The application uses PostgreSQL with the following main tables:

- admins
- division_users  
- institution_users
- institution_payment_details
- institution_bills
- admin_payment_details
- admin_bills

## Getting Started

### Local Development Setup

1. Clone the repository:

```bash
git clone https://github.com/Venkat-357/JSS-TAX-REPORT-GENERATOR.git
cd jss-tax-report-generator
```

2. Install dependencies:

```bash
npm install
```

3. Create .env file:

- You can use the template in `.env.template` to create your own `.env` file.
- Example:

```bash
# App deployment config
APP_PORT=3000
APP_SECRET=your-secret-key

# Postgres Config
POSTGRES_HOST=localhost
POSTGRES_USER=your-db-user
POSTGRES_DATABASE=jss_tax_db
POSTGRES_PASSWORD=your-db-password
POSTGRES_PORT=5432

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=adminpass
```

4. Start development server:

```bash
npm run dev
```

### Docker Deployment

1. Build the Docker image:

```bash
docker build -t jss-tax-generator .
```

2. Run the container:

```bash
docker run -p 3003:3003 \
  --env-file .env \
  jss-tax-generator
```

## API Endpoints

### Authentication Routes

```
GET  /login          - Login page
POST /login          - Process login
GET  /logout         - Logout user
```

### Admin Routes

```bash
GET  /admin                         - Admin dashboard
GET  /list_all_division_users       - List division users
GET  /modify_division_user          - Modify division user form
POST /modify_division_user          - Update division user
GET  /delete_division_user          - Delete division user
GET  /list_all_institution_users    - List all institutions
GET  /list_all_payment_details      - List all payments
GET  /create_new_division           - Create division form  
POST /create_new_division           - Create new division
GET  /comprehensive_report_admin    - View comprehensive report
GET  /local_report_admin            - View local report
GET  /new_admin_payment_details      - Add payment temporarily form
POST /new_admin_payment_details     - Create temporary payment record
GET  /transfer_admin_payment_details - Transfer temporary payment to institution page
POST /transfer_admin_payment_details - Transfer payment to institution
```

### Division Routes

```bash
GET  /division                           - Division dashboard  
GET  /list_institution_users_in_division - List institutions
GET  /modify_institution_users           - Modify institution form
POST /modify_institution_users           - Update institution
GET  /delete_institution                 - Delete institution
GET  /list_payment_details_in_division   - List division payments
GET  /create_new_institution             - Create institution form
POST /create_new_institution             - Create new institution
GET  /comprehensive_report_division      - Division comprehensive report
GET  /local_report_division              - Division local report
```

### Institution Routes

```bash
GET  /institution                         - Institution dashboard
GET  /list_payment_details_in_institution - List payments
GET  /new_institution_payment_details     - Add payment form  
POST /new_institution_payment_details     - Create payment record
GET  /modify_institution_payment_details  - Modify payment form
POST /modify_institution_payment_details  - Update payment record
GET  /delete_institution_payment_details  - Delete payment record
GET  /comprehensive_report_institution    - Institution comprehensive report
GET  /local_report_institution            - Institution local report
```

## Core Features

### Report Generation

- Comprehensive reports with detailed payment information
- Local reports with basic institution details
- Print-friendly report formats
- Export functionality

### Payment Management

- Add/modify payment records
- Upload supporting documents
- Payment approval workflow (division users can approve institution payments. These approved payments are then visible to admin users)
- Track payment history

### User Management

- Role-based access control (admins, division users, institution users)
- User creation and modification (admins can create division users, division users can create institution users)
- Password management
- Activity logging

## Security Features

1. Authentication & Authorization

- Session-based authentication
- Role-based access control
- Protected routes
- Secure password handling

2. Data Validation

- Input sanitization
- Form validation
- File upload restrictions
- SQL injection prevention

## File Structure

```bash
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── divisionController.js
│   └── institutionController.js
├── middleware/
│   ├── auth_wrap.js
│   ├── restrict_routes.js
│   └── set_flash_messages.js
├── public/
│   ├── css/ [Includes Bootstrap CSS]
│   └── js/  [Includes Bootstrap JS]
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── divisionRoutes.js
│   └── institutionRoutes.js
├── utils/
│   ├── create_tables.js
│   └── Validation.js
├── views/
│   ├── partials/
│   └── *.ejs
├── .env
├── db.js
├── Dockerfile
├── index.js
└── package.json
```

## Error Handling

- Flash messages for user feedback
- Error logging
- Graceful error recovery
- Database transaction safety

## Maintenance & Monitoring

- Morgan logging for HTTP requests
- Database connection monitoring
- Error reporting
- Session management

## Contributors

The following contributors have helped in the development of this project.

- Please add your name and a link to your profile if you have contributed to this project.
- Feel free to reach out to the maintainers for any queries.

1. [Venkat-357](https://github.com/Venkat-357)
2. [Sayed-Afnan-Khazi](https://github.com/Sayed-Afnan-Khazi)
