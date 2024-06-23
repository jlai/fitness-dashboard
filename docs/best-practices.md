# Best practices

## Strings

- Use sentence case rather than Title Case. This will make it easier to migrate to Material 3.
- Avoid directly interpolating variables into strings, since the order can vary by language.

## Accessibility

- Use buttons for clickable elements, instead of `onClick` attached to other elements.
  This ensures that the role is set correctly and handles keyboard events correctly.
  - Currently this is not done in many places and will need cleanup.
