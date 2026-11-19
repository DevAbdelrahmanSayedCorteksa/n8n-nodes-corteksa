# Changelog

All notable changes to this package are documented in this file.

## 0.1.1

### Changed

- README: install steps for n8n Cloud and self-hosted instances (verified community nodes setting, environment
  variables, install by name, queue mode). No code changes.

## 0.1.0

First release.

### Added

- **Corteksa** node, declarative, usable as an AI Agent tool:
  - Record: Create, Get, Get Many, Search, Update, Delete, Assign, Unassign, Distribute, Add Tags, Remove Tags,
    Link, Unlink, Move, Merge, Attach File. Create and Update map the fields of the chosen unit.
  - Task: Create, Get, Get Many, Update, Complete, Reopen, Delete.
  - Comment: Create, Reply, Update, Delete, Get Many.
  - Conversation: Send Message, Send WhatsApp Message, Send WhatsApp Template, Send WhatsApp Poll, Get, Get Many,
    Update, Assign, Add Tags, Remove Tags.
  - Email: Send, Reply, Create Draft, Link to Record, Get Many Threads.
  - Workflow: Run, Retry Run, Get Many. Approval: Approve, Reject, Get Many.
  - Member, Team and Document Template: Get Many. Document: Generate (PDF).
- **Corteksa Trigger** node, which subscribes to its event when the workflow is activated and unsubscribes when it
  is deactivated:
  - Events: Approval Requested, Comment Created, Conversation Assigned, Email Received, Email Sent, Message Received,
    Message Sent, Notification Created, Record Created, Record Deleted, Record Stage Changed, Record Updated, Task
    Completed, Task Created, Workflow Run Completed, Workflow Run Failed.
  - Filters by unit, stage field and new stages, watched fields, workflow, assignee, mailbox, channel type and
    channel, and notification kind.
  - Verifies the Standard Webhooks signature of every delivery and refuses an unsigned or stale one.
  - Simplify, on by default, returns one flat item per event; record and task events read the record again
    for its current values.
- **Corteksa API** credential (API key and workspace), also usable from the HTTP Request node.
