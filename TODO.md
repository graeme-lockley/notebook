# TODO

## Defects

- [ ] Duplicate does not have a server side route.
- [ ] Create a new notebook does not create the notebook topic. The event is published however the consumers are not working.

## Features

### Notebook

- [ ] Update a notebook description. It does look like that this event is not handled correctly on the client side as the client side is assuming that the entire array of cells is also emitted. This should not be the case.

## Thoughts

- [ ] The responses returned from the server-side routes are constructed as untyped Javascript objects. This is not helpful in that the client would want to have the type interfaces to inspect these responses. Placing these interfaces in a location where both the client and service can access would be very helpful. Unsure what the idiomatic way of doing this is.
