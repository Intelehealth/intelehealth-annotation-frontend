# Review Consensus Permission Matrix

This is a documentation-only permission reference. It does not introduce permission-management UI or change the existing shell.

| Capability | Owner | Admin | Annotator |
| --- | ---: | ---: | ---: |
| View Review Consensus | Yes | Yes | No |
| View summary cards | Yes | Yes | No |
| View annotator progress | Yes | Yes | No |
| View consensus rows | Yes | Yes | No |
| Open row details drawer | Yes | Yes | No |
| Approve | Yes | Yes | No |
| Review Again | Yes | Yes | No |
| Start Collaborative Review | Yes | Yes | No |
| Export dataset | Yes | Yes | No |
| Export row | Yes | Yes | No |
| Receive Review Request | No | No | Yes |
| View Review Request notification | No | No | Yes |
| Open requested annotation row | No | No | Yes |
| Edit requested annotation | No | No | Yes |
| Submit Re-Annotation | No | No | Yes |
| Approve consensus | No | No | No |
| Override consensus | No | No | No |
| Reject consensus | No | No | No |

## Route Boundaries

- Admins and Owners use the Review Consensus route.
- Annotators use existing Tasks, Notifications, and Annotation Workbench routes.
- Annotators never open or operate the Review Consensus page.
- The existing Sidebar and TopNav remain unchanged for every role.
