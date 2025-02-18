# Database Schema Documentation

## Tables Overview

### invites
- id (uuid, primary key)
- provider_id (uuid, references auth.users)
- email (text)
- code (text)
- status (text)
- expires_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)

### habits
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- name (text)
- description (text)
- icon (text)
- frequency (text)
- d... (additional fields)
- created_at (timestamp)
- updated_at (timestamp)

### goals
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- name (text)
- description (text)
- icon (text)
- target_value (numeric)
- current_value (numeric)
- unit (text)
- deadline (date)
- d... (additional fields)
- created_at (timestamp)
- updated_at (timestamp)

### check_ins
- id (uuid, primary key)
- patient_id (uuid, references auth.users)
- d... (additional fields)
- created_at (timestamp)
- updated_at (timestamp)

### auth.users (User Profile)
- id (uuid, primary key)
- email (text)
- phone (text)
- photo_url (text)
- date_of_birth (date)
- gender (text)
- addr... (address fields)
- metadata (jsonb)
- created_at (timestamp)
- updated_at (timestamp)
- preferences (jsonb)
- height (text)
- weight (text)
- blood_type (text)
- emergency_contact (jsonb)

### chat_threads
- id (uuid, primary key)
- created_at (timestamp)
- updated_at (timestamp)

### chat_participants
- id (uuid, primary key)
- thread_id (uuid, references chat_threads)
- user_id (uuid, references auth.users)
- role (text, 'patient' or 'provider')
- created_at (timestamp)
- Unique constraint on (thread_id, user_id)

### chat_messages
- id (uuid, primary key)
- thread_id (uuid, references chat_threads)
- sender_id (uuid, references auth.users)
- content (text)
- created_at (timestamp)
- read_at (timestamp)
- Constraint: sender must be a participant in the thread

### chat_attachments
- id (uuid, primary key)
- message_id (uuid, references chat_messages)
- name (text)
- type (text)
- url (text)
- size (integer)
- created_at (timestamp)

### auth.users.id (References)
- Primary identifier for user authentication
- Referenced by:
  - habits.user_id
  - goals.user_id
  - check_ins.patient_id
  - invites.provider_id
  - chat_participants.user_id
  - chat_messages.sender_id

## Relationships
- habits.user_id -> auth.users.id
- goals.user_id -> auth.users.id
- check_ins.patient_id -> auth.users.id
- invites.provider_id -> auth.users.id
- chat_participants.user_id -> auth.users.id
- chat_participants.thread_id -> chat_threads.id
- chat_messages.thread_id -> chat_threads.id
- chat_messages.sender_id -> auth.users.id
- chat_attachments.message_id -> chat_messages.id

## Security Policies
- RLS (Row Level Security) enabled
- User-specific data access controls
- Provider-specific access patterns
- Invite system with expiration handling
- Patient data access restrictions
- Provider-patient relationship controls
- Chat thread access limited to participants
- Message read/write permissions based on thread participation
- Attachment access controlled by message ownership
- Chat participant role enforcement

## Data Types
- UUID: Primary and foreign keys
- Text: String data, variable length
- Timestamp: Date/time with timezone
- Numeric: Decimal numbers
- Date: Calendar dates
- JSONB: Binary JSON data
- Boolean: True/false values

## Audit Features
- created_at/updated_at timestamps on all tables
- Automatic timestamp updates
- User action tracking
- Change history preservation

## Notes
- All timestamps include timezone information
- UUID v4 used for all primary keys
- JSONB fields allow flexible metadata storage
- Strict typing enforced on all fields
- Built-in audit trails via timestamps
- Referential integrity enforced
- Cascading updates/deletes configured
