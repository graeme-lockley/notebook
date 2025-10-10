# TODO

## Defects

- [x] Duplicate does not have a server side route.
- [x] Create a new notebook does not create the notebook topic. The event is published however the consumers are not working. It does appear that the new projections and the former approach are interfering which each other. This must be unified and cleaned up.

## Features

### Identification

- [ ] Allow people to identify themselves. This identity is necessary to acccomodate private and public notebooks. Should then not be identified, then they are limited to the public notebooks.

### Projections

- [x] All notebook projections are loaded at start-up. This is aweful. I would like a notebook projection to be managed in a lazy manner. If no consumer has that notebook open, then the projection must be discarded. When a consumer opens a notebook, that notebook's projection should be hydrated. Projections will be shared between consumers. A reference counting scheme will need to be used here.
  - Implemented NotebookProjectionManager with lazy loading and reference counting
  - Projections are hydrated on-demand when accessed via WebSocket or REST API
  - Grace period eviction (60 seconds default) handles quick reconnections
  - Event streaming keeps projections current without re-hydration
  - Multiple consumers share the same projection instance
  - Comprehensive unit and integration tests included

### Notebook

- [ ] Update a notebook description. It does look like that this event is not handled correctly on the client side as the client side is assuming that the entire array of cells is also emitted. This should not be the case.
- [ ] Enable searching for a notebook based on the title and, when selected, open the notebook. The search can be limited to private only or public.
- [ ] Allow a notebook to refer to another notebook.
- [ ] Think about notebook scoping. Each notebook can be marked private, and public. When private, only the creator can see and edit the notebook. Public everyone can see it. A public notebook can be edited only by the creator however, it can be cloned into private and then edited from there.
- [ ] Have a read-only version of a notebook. This will allow people to read a notebook without worrying about accidentally editing the content. The current veresion is a read-write view.

## Thoughts

- [ ] The responses returned from the server-side routes are constructed as untyped Javascript objects. This is unhelpful in that the client would want to have the type interfaces to inspect these responses. Placing these interfaces in a location where both the client and service can access would be very helpful. Unsure what the idiomatic way of doing this is.
