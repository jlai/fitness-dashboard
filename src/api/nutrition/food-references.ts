const FOOD_RESOURCE_NAME_PATTERN =
  /^users\/me\/dataTypes\/food\/dataPoints\/([a-z0-9-]{1,63})$/;
const FOOD_TEMPLATE_PATTERN =
  /^foodTemplate:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/** A persisted food reference is either a Google Health resource name or a local template reference. */
export function isFoodReference(value: string): boolean {
  return (
    FOOD_RESOURCE_NAME_PATTERN.test(value) || FOOD_TEMPLATE_PATTERN.test(value)
  );
}

export function isFoodResourceReference(value: string): boolean {
  return FOOD_RESOURCE_NAME_PATTERN.test(value);
}

export function foodIdFromReference(value: string): string | undefined {
  return FOOD_RESOURCE_NAME_PATTERN.exec(value)?.[1];
}

export function foodTemplateReference(templateId: string): string {
  return `foodTemplate:${templateId}`;
}

export function foodTemplateIdFromReference(value: string): string | undefined {
  return FOOD_TEMPLATE_PATTERN.exec(value)?.[1];
}

export function foodReferenceForFoodId(
  foodId: string,
  templates: Array<{ id?: string; customFood?: string }>,
): string {
  const template = templates.find(
    (entry) =>
      entry.id === foodId ||
      foodIdFromReference(entry.customFood ?? "") === foodId,
  );
  return template?.id
    ? foodTemplateReference(template.id)
    : `users/me/dataTypes/food/dataPoints/${foodId}`;
}
