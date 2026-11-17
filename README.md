# n8n-nodes-corteksa

This is an n8n community node package for [Corteksa](https://corteksa.com), the CRM for sales and support teams. It lets
your n8n workflows work with Corteksa records, tasks, comments, WhatsApp conversations, email, workflows, approvals
and documents.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) ·
[Credentials](#credentials) ·
[Operations](#operations) ·
[Trigger events](#trigger-events) ·
[Compatibility](#compatibility) ·
[Usage](#usage) ·
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community
nodes documentation and install `n8n-nodes-corteksa`.

The package adds two nodes:

- **Corteksa**: the actions below.
- **Corteksa Trigger**: starts a workflow when something happens in Corteksa, see [Trigger events](#trigger-events).

## Credentials

The nodes sign in with a Corteksa API key.

1. In Corteksa, open **Settings > Developers > API keys** and click **New key**.
2. Give the key access to the units your workflows use (for example Read, Write and Delete on Leads), and tick
   **Send** if your workflows send WhatsApp messages or emails. The key starts with `crtk_live_`. Copy it: Corteksa
   shows it only once.
3. In n8n, create a **Corteksa API** credential:
   - **API Key**: the key you copied.
   - **Workspace**: keep `app` if you sign in at `app.corteksa.com`. If you sign in at your own address, such as
     `acme.corteksa.com`, enter only its first part: `acme`.

n8n checks the credential by reading `GET /v1/me` with it.

Each API key can make 120 requests a minute. Past that, Corteksa answers with a rate limit message that says how long
to wait; turn on **Retry On Fail** in the node settings for large batches.

### Calling other endpoints with the HTTP Request node

For an endpoint this node does not cover, use the **HTTP Request** node with **Authentication** set to
**Predefined Credential Type** and **Corteksa API**. The credential adds the `Authorization` header; the URL is
`https://<workspace>.corteksa.info/api/` followed by the path from the
[API reference](https://docs.corteksa.com/api-reference/overview), such as `https://app.corteksa.info/api/v1/me`.

## Operations

In Corteksa, a **unit** is a kind of record, such as Leads, Deals or Suppliers, and its **fields** are the columns of
those records. Every operation that takes a unit lists the units the API key can read.

| Resource          | Operations                                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Record            | Create, Get, Get Many (filter by a field value or an assignee, sort), Search (full text), Update, Delete, Assign, Unassign, Distribute (lead distribution scenario or rule), Add Tags, Remove Tags, Link, Unlink, Move (to another unit), Merge (duplicates), Attach File |
| Task              | Create (optionally about a record), Get, Get Many, Update, Complete, Reopen, Delete                                                                                                                                                                                       |
| Comment           | Create, Reply, Update, Delete, Get Many                                                                                                                                                                                                                                   |
| Conversation      | Send Message, Send WhatsApp Message (to a record), Send WhatsApp Template (to a record), Send WhatsApp Poll, Get, Get Many (by phone number or record), Update (answered, archived, starred, pinned, read), Assign, Add Tags, Remove Tags                                 |
| Email             | Send (to a record), Reply, Create Draft, Link to Record, Get Many Threads (of a record)                                                                                                                                                                                   |
| Workflow          | Run (workflows with an API or webhook trigger), Retry Run, Get Many                                                                                                                                                                                                       |
| Approval          | Approve, Reject, Get Many                                                                                                                                                                                                                                                 |
| Member            | Get Many                                                                                                                                                                                                                                                                  |
| Team              | Get Many                                                                                                                                                                                                                                                                  |
| Document          | Generate (a PDF from a document template, optionally saved to a file field of the record)                                                                                                                                                                                 |
| Document Template | Get Many                                                                                                                                                                                                                                                                  |

Create and Update take the unit's own fields through a field mapper that loads the fields of the chosen unit.
Multi-select and tag fields take option labels or IDs separated by commas; relation fields take record IDs.

Operations that return records, tasks, comments, conversations, email threads or workflows have a **Simplify**
option, on by default, that returns the ten most used values. Turn it off for the full Corteksa response, where
record values are keyed by field ID.

The node can be used as a tool by the n8n AI Agent.

## Trigger events

The **Corteksa Trigger** node watches one event. When you activate the workflow, the node subscribes to that event in
Corteksa with the node's webhook URL; when you deactivate it, the node deletes the subscription. Changes made with the
same API key, for example by a Corteksa node in another workflow, also start it.

| Event                  | Starts the workflow when                                  | Filters                                          |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Approval Requested     | a workflow run pauses for an approval                     | Workflow                                         |
| Comment Created        | someone comments on a record of the chosen unit           | Object (required)                                |
| Conversation Assigned  | a conversation is given to a member                       | Assigned To                                      |
| Email Received         | a connected mailbox receives an email                     | Mailbox                                          |
| Email Sent             | an email is sent from a connected mailbox                 | Mailbox                                          |
| Message Received       | a WhatsApp, Instagram, Facebook or TikTok message arrives | Channel Type, Channel                            |
| Message Sent           | a WhatsApp, Instagram, Facebook or TikTok message is sent | Channel Type, Channel                            |
| Notification Created   | the member who created the API key gets a notification    | Notification Kind                                |
| Record Created         | a record is created in the chosen unit                    | Object (required)                                |
| Record Deleted         | a record of the chosen unit is deleted                    | Object (required)                                |
| Record Stage Changed   | a record of the chosen unit moves to another stage        | Object (required), Stage Field, New Stages       |
| Record Updated         | a record of the chosen unit changes                       | Object (required), Watched Fields (or Assignees) |
| Task Completed         | a task is marked as done                                  |                                                  |
| Task Created           | a task is created                                         |                                                  |
| Workflow Run Completed | a workflow run finishes successfully                      | Workflow                                         |
| Workflow Run Failed    | a workflow run fails                                      | Workflow                                         |

**Object** is the unit to watch. Corteksa narrows a subscription by unit only, so the node applies every other filter
itself: a delivery that does not match is acknowledged and does not start the workflow. Leave a filter empty to accept
every delivery of the event. **New Stages** are stage IDs, so a filter survives a rename of the stage.

Every delivery is signature-verified. Corteksa signs each one with the
[Standard Webhooks](https://www.standardwebhooks.com/) scheme, using the signing secret it returns when the node
subscribes. A delivery with a missing or wrong signature, or a timestamp more than five minutes old, is answered with
`401` and does not start the workflow. **Send test event** in Corteksa reaches the node but does not start the
workflow either.

**Simplify**, on by default, returns one flat item per event:

- Record Created, Updated and Stage Changed and the task events read the record again, so the item holds its current
  values: ID, name, link, owner, assignees, creator, linked record, and every field value keyed by field ID. A record
  deleted since the event comes back with empty values.
- Comment Created returns the comment, whether it is a reply, its author, and the name and link of the record.
- Record Updated adds the changed fields, with their old and new values, and the previous assignees. Record Stage
  Changed adds the new and previous stage. Task events add the title, description, status, priority, type and dates.
- Record Deleted returns the record as Corteksa stored it when it was deleted.
- Message, email, conversation, notification, approval and workflow run events return the event's own values, such as
  the message text, the sender, the conversation and the linked record.

Turn Simplify off for the full Corteksa event. For record, task and comment events, the current record is added to it
under `record`.

## Compatibility

- Requires n8n 2.46.1 or later.
- Tested with n8n 2.48.4 against the production Corteksa API.

## Usage

- IDs in Corteksa are short strings (for example `98379c221ffe`), shown as "ID" in this node. Every list in the node
  also accepts an ID or an expression, so you can map IDs from a Corteksa Trigger or a previous step.
- Delete operations return `{ "deleted": true }`.
- Sending WhatsApp messages and emails needs the **Send** access on the API key, and a connected WhatsApp number or
  mailbox in Corteksa.
- Corteksa answers refusals with a message and a code, such as `DISTRIBUTION_RECORD_ALREADY_OWNED`. The node shows
  both, with what to change.

## Resources

- [Corteksa API reference](https://docs.corteksa.com/api-reference/overview)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Version history

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE.md)
